#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestFramework {
  name: string;
  configFiles: string[];
  testFilePatterns: string[];
}

interface TestAnalysisResult {
  framework: string | null;
  testFiles: string[];
  testCount: number;
  coverageConfig: any;
  testStructure: {
    suites: number;
    tests: number;
    hooks: string[];
  };
  dependencies: string[];
  summary: string;
}

interface CoverageResult {
  lines: { percentage: number; covered: number; total: number };
  statements: { percentage: number; covered: number; total: number };
  functions: { percentage: number; covered: number; total: number };
  branches: { percentage: number; covered: number; total: number };
  summary: string;
}

class TestAnalyzerServer {
  private server: Server;
  
  private readonly frameworks: TestFramework[] = [
    {
      name: 'jest',
      configFiles: ['jest.config.js', 'jest.config.ts', 'jest.config.json', 'package.json'],
      testFilePatterns: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}', '**/__tests__/**/*.{js,jsx,ts,tsx}']
    },
    {
      name: 'vitest',
      configFiles: ['vitest.config.js', 'vitest.config.ts', 'vite.config.js', 'vite.config.ts'],
      testFilePatterns: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}', '**/__tests__/**/*.{js,jsx,ts,tsx}']
    },
    {
      name: 'mocha',
      configFiles: ['.mocharc.js', '.mocharc.json', '.mocharc.yaml', '.mocharc.yml', 'mocha.opts'],
      testFilePatterns: ['test/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}']
    },
    {
      name: 'cypress',
      configFiles: ['cypress.config.js', 'cypress.config.ts', 'cypress.json'],
      testFilePatterns: ['cypress/integration/**/*.{js,jsx,ts,tsx}', 'cypress/e2e/**/*.{js,jsx,ts,tsx}', '**/*.cy.{js,jsx,ts,tsx}']
    },
    {
      name: 'playwright',
      configFiles: ['playwright.config.js', 'playwright.config.ts'],
      testFilePatterns: ['**/*.spec.{js,jsx,ts,tsx}', 'tests/**/*.{js,jsx,ts,tsx}', 'e2e/**/*.{js,jsx,ts,tsx}']
    }
  ];

  constructor() {
    this.server = new Server(
      {
        name: 'test-analyzer',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_test_setup',
          description: 'Analyze the unit test setup of a repository, including framework detection, test file discovery, and configuration analysis',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Path to the repository to analyze',
              },
            },
            required: ['repoPath'],
          },
        },
        {
          name: 'check_coverage',
          description: 'Check test coverage for a repository and provide detailed metrics',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Path to the repository',
              },
              runTests: {
                type: 'boolean',
                description: 'Whether to run tests to generate fresh coverage data',
                default: false,
              },
            },
            required: ['repoPath'],
          },
        },
        {
          name: 'get_test_summary',
          description: 'Get a comprehensive summary of the test setup, coverage, and recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Path to the repository',
              },
            },
            required: ['repoPath'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'analyze_test_setup':
          return await this.analyzeTestSetup(request.params.arguments);
        case 'check_coverage':
          return await this.checkCoverage(request.params.arguments);
        case 'get_test_summary':
          return await this.getTestSummary(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async analyzeTestSetup(args: any) {
    if (!args.repoPath || typeof args.repoPath !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'repoPath is required');
    }

    try {
      const repoPath = path.resolve(args.repoPath);
      
      // Check if path exists
      try {
        await fs.access(repoPath);
      } catch {
        throw new McpError(ErrorCode.InvalidParams, `Repository path does not exist: ${repoPath}`);
      }

      // Detect test framework
      const framework = await this.detectTestFramework(repoPath);
      
      // Find test files
      const testFiles = await this.findTestFiles(repoPath, framework);
      
      // Analyze test structure
      const testStructure = await this.analyzeTestStructure(testFiles);
      
      // Get coverage configuration
      const coverageConfig = await this.getCoverageConfig(repoPath, framework);
      
      // Get test dependencies
      const dependencies = await this.getTestDependencies(repoPath);
      
      const result: TestAnalysisResult = {
        framework: framework?.name || null,
        testFiles: testFiles.map(f => path.relative(repoPath, f)),
        testCount: testStructure.tests,
        coverageConfig,
        testStructure,
        dependencies,
        summary: this.generateTestSetupSummary({
          framework: framework?.name || null,
          testFiles,
          testStructure,
          coverageConfig,
          dependencies,
        }),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing test setup: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async checkCoverage(args: any) {
    if (!args.repoPath || typeof args.repoPath !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'repoPath is required');
    }

    try {
      const repoPath = path.resolve(args.repoPath);
      
      // Check if path exists
      try {
        await fs.access(repoPath);
      } catch {
        throw new McpError(ErrorCode.InvalidParams, `Repository path does not exist: ${repoPath}`);
      }

      let coverageData: CoverageResult | null = null;

      if (args.runTests) {
        // Try to run tests with coverage
        coverageData = await this.runTestsWithCoverage(repoPath);
      } else {
        // Try to read existing coverage data
        coverageData = await this.readExistingCoverage(repoPath);
      }

      if (!coverageData) {
        return {
          content: [
            {
              type: 'text',
              text: 'No coverage data found. Try running with runTests: true to generate fresh coverage data.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(coverageData, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      return {
        content: [
          {
            type: 'text',
            text: `Error checking coverage: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getTestSummary(args: any) {
    if (!args.repoPath || typeof args.repoPath !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'repoPath is required');
    }

    try {
      const repoPath = path.resolve(args.repoPath);
      
      // Get test setup analysis
      const setupResult = await this.analyzeTestSetup({ repoPath });
      const setup = JSON.parse(setupResult.content[0].text);
      
      // Get coverage data
      const coverageResult = await this.checkCoverage({ repoPath, runTests: false });
      const coverage = coverageResult.content[0].text.includes('No coverage data') 
        ? null 
        : JSON.parse(coverageResult.content[0].text);
      
      // Generate comprehensive summary
      const summary = this.generateComprehensiveSummary(setup, coverage);
      
      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      
      return {
        content: [
          {
            type: 'text',
            text: `Error generating summary: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async detectTestFramework(repoPath: string): Promise<TestFramework | null> {
    for (const framework of this.frameworks) {
      for (const configFile of framework.configFiles) {
        const configPath = path.join(repoPath, configFile);
        try {
          await fs.access(configPath);
          
          // Special check for Jest in package.json
          if (configFile === 'package.json' && framework.name === 'jest') {
            const packageJson = JSON.parse(await fs.readFile(configPath, 'utf-8'));
            if (packageJson.jest || (packageJson.scripts && Object.values(packageJson.scripts).some((script: any) => script.includes('jest')))) {
              return framework;
            }
          } else {
            return framework;
          }
        } catch {
          // Config file doesn't exist, continue checking
        }
      }
    }
    
    // Check package.json for test dependencies
    try {
      const packageJsonPath = path.join(repoPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      for (const framework of this.frameworks) {
        if (allDeps[framework.name]) {
          return framework;
        }
      }
    } catch {
      // No package.json or error reading it
    }
    
    return null;
  }

  private async findTestFiles(repoPath: string, framework: TestFramework | null): Promise<string[]> {
    const patterns = framework?.testFilePatterns || [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
    ];
    
    const testFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: repoPath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**'],
      });
      testFiles.push(...files);
    }
    
    // Remove duplicates
    return [...new Set(testFiles)];
  }

  private async analyzeTestStructure(testFiles: string[]): Promise<any> {
    let suites = 0;
    let tests = 0;
    const hooks = new Set<string>();
    
    for (const file of testFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const ast = parser.parse(content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
        });
        
        traverse.default(ast, {
          CallExpression(path: any) {
            const callee = path.node.callee;
            if (callee.type === 'Identifier') {
              const name = callee.name;
              
              // Count test suites
              if (['describe', 'suite', 'context'].includes(name)) {
                suites++;
              }
              
              // Count individual tests
              if (['it', 'test', 'specify'].includes(name)) {
                tests++;
              }
              
              // Track hooks
              if (['beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'before', 'after'].includes(name)) {
                hooks.add(name);
              }
            }
          },
        });
      } catch {
        // Error parsing file, skip it
      }
    }
    
    return {
      suites,
      tests,
      hooks: Array.from(hooks),
    };
  }

  private async getCoverageConfig(repoPath: string, framework: TestFramework | null): Promise<any> {
    const configs: any = {};
    
    // Check for NYC/Istanbul config
    const nycConfigFiles = ['.nycrc', '.nycrc.json', '.nycrc.yml', '.nycrc.yaml'];
    for (const configFile of nycConfigFiles) {
      try {
        const configPath = path.join(repoPath, configFile);
        const content = await fs.readFile(configPath, 'utf-8');
        configs.nyc = JSON.parse(content);
        break;
      } catch {
        // Config doesn't exist or can't be parsed
      }
    }
    
    // Check package.json for coverage config
    try {
      const packageJsonPath = path.join(repoPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.nyc) {
        configs.nyc = packageJson.nyc;
      }
      
      if (packageJson.jest?.collectCoverage !== undefined || packageJson.jest?.coverageDirectory) {
        configs.jest = packageJson.jest;
      }
    } catch {
      // No package.json or error reading it
    }
    
    // Check for framework-specific coverage config
    if (framework?.name === 'jest') {
      try {
        const jestConfigPath = path.join(repoPath, 'jest.config.js');
        await fs.access(jestConfigPath);
        configs.jestConfigFile = true;
      } catch {
        // No jest.config.js
      }
    }
    
    return configs;
  }

  private async getTestDependencies(repoPath: string): Promise<string[]> {
    const testDeps: string[] = [];
    
    try {
      const packageJsonPath = path.join(repoPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const devDeps = packageJson.devDependencies || {};
      
      const testRelatedPackages = [
        'jest', 'vitest', 'mocha', 'chai', 'sinon', 'cypress', 'playwright',
        '@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event',
        'enzyme', 'react-test-renderer', 'karma', 'jasmine', 'qunit',
        'nyc', 'c8', 'istanbul', '@vitest/coverage-c8', '@vitest/coverage-istanbul',
      ];
      
      for (const pkg of testRelatedPackages) {
        if (devDeps[pkg]) {
          testDeps.push(`${pkg}@${devDeps[pkg]}`);
        }
      }
    } catch {
      // Error reading package.json
    }
    
    return testDeps;
  }

  private async runTestsWithCoverage(repoPath: string): Promise<CoverageResult | null> {
    try {
      // Try common test coverage commands
      const commands = [
        'npm run test:coverage',
        'npm run coverage',
        'npm test -- --coverage',
        'yarn test:coverage',
        'yarn coverage',
        'yarn test --coverage',
        'npx jest --coverage',
        'npx vitest run --coverage',
      ];
      
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd, { cwd: repoPath });
          
          // Try to parse coverage from output
          const coverage = this.parseCoverageFromOutput(stdout);
          if (coverage) {
            return coverage;
          }
        } catch {
          // Command failed, try next one
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private async readExistingCoverage(repoPath: string): Promise<CoverageResult | null> {
    // Common coverage output locations
    const coverageFiles = [
      'coverage/coverage-summary.json',
      'coverage/lcov-report/index.html',
      'coverage-final.json',
      '.nyc_output/processinfo/index.json',
    ];
    
    for (const file of coverageFiles) {
      try {
        const coveragePath = path.join(repoPath, file);
        const content = await fs.readFile(coveragePath, 'utf-8');
        
        if (file.endsWith('.json')) {
          const data = JSON.parse(content);
          
          // Parse coverage-summary.json format
          if (data.total) {
            return {
              lines: data.total.lines,
              statements: data.total.statements,
              functions: data.total.functions,
              branches: data.total.branches,
              summary: this.generateCoverageSummary(data.total),
            };
          }
        }
      } catch {
        // File doesn't exist or can't be parsed
      }
    }
    
    return null;
  }

  private parseCoverageFromOutput(output: string): CoverageResult | null {
    // Try to parse coverage table from console output
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for coverage summary patterns
      if (line.includes('Statements') && line.includes('%')) {
        try {
          // Parse Jest/Vitest style output
          const stmtMatch = line.match(/Statements\s*:\s*([\d.]+)%/);
          const branchMatch = lines[i + 1]?.match(/Branches\s*:\s*([\d.]+)%/);
          const funcMatch = lines[i + 2]?.match(/Functions\s*:\s*([\d.]+)%/);
          const lineMatch = lines[i + 3]?.match(/Lines\s*:\s*([\d.]+)%/);
          
          if (stmtMatch) {
            const result: CoverageResult = {
              statements: { percentage: parseFloat(stmtMatch[1]), covered: 0, total: 0 },
              branches: { percentage: parseFloat(branchMatch?.[1] || '0'), covered: 0, total: 0 },
              functions: { percentage: parseFloat(funcMatch?.[1] || '0'), covered: 0, total: 0 },
              lines: { percentage: parseFloat(lineMatch?.[1] || '0'), covered: 0, total: 0 },
              summary: '',
            };
            
            result.summary = this.generateCoverageSummary(result);
            return result;
          }
        } catch {
          // Continue searching
        }
      }
    }
    
    return null;
  }

  private generateCoverageSummary(coverage: any): string {
    const getStatus = (percentage: number) => {
      if (percentage >= 80) return '✅ Good';
      if (percentage >= 60) return '⚠️ Fair';
      return '❌ Poor';
    };
    
    const lines = coverage.lines?.percentage || coverage.lines?.pct || 0;
    const statements = coverage.statements?.percentage || coverage.statements?.pct || 0;
    const functions = coverage.functions?.percentage || coverage.functions?.pct || 0;
    const branches = coverage.branches?.percentage || coverage.branches?.pct || 0;
    
    return `Coverage Summary:
- Lines: ${lines.toFixed(1)}% ${getStatus(lines)}
- Statements: ${statements.toFixed(1)}% ${getStatus(statements)}
- Functions: ${functions.toFixed(1)}% ${getStatus(functions)}
- Branches: ${branches.toFixed(1)}% ${getStatus(branches)}

Overall: ${getStatus((lines + statements + functions + branches) / 4)}`;
  }

  private generateTestSetupSummary(data: any): string {
    const { framework, testFiles, testStructure, coverageConfig, dependencies } = data;
    
    let summary = `Test Setup Analysis:\n\n`;
    
    summary += `📦 Framework: ${framework || 'None detected'}\n`;
    summary += `📁 Test Files: ${testFiles.length} files found\n`;
    summary += `🧪 Tests: ${testStructure.tests} tests in ${testStructure.suites} suites\n`;
    
    if (testStructure.hooks.length > 0) {
      summary += `🔧 Hooks: ${testStructure.hooks.join(', ')}\n`;
    }
    
    if (Object.keys(coverageConfig).length > 0) {
      summary += `\n📊 Coverage Configuration:\n`;
      Object.keys(coverageConfig).forEach((key: string) => {
        summary += `  - ${key}: Configured\n`;
      });
    }
    
    if (dependencies.length > 0) {
      summary += `\n📚 Test Dependencies:\n`;
      dependencies.slice(0, 10).forEach((dep: string) => {
        summary += `  - ${dep}\n`;
      });
      if (dependencies.length > 10) {
        summary += `  ... and ${dependencies.length - 10} more\n`;
      }
    }
    
    return summary;
  }

  private generateComprehensiveSummary(setup: TestAnalysisResult, coverage: CoverageResult | null): string {
    let summary = `# Test Analysis Report\n\n`;
    
    // Test Setup Section
    summary += `## Test Setup\n\n`;
    summary += `- **Framework**: ${setup.framework || 'None detected'}\n`;
    summary += `- **Test Files**: ${setup.testFiles.length}\n`;
    summary += `- **Total Tests**: ${setup.testCount}\n`;
    summary += `- **Test Suites**: ${setup.testStructure.suites}\n`;
    
    if (setup.testStructure.hooks.length > 0) {
      summary += `- **Hooks Used**: ${setup.testStructure.hooks.join(', ')}\n`;
    }
    
    // Coverage Section
    summary += `\n## Coverage\n\n`;
    if (coverage) {
      summary += coverage.summary;
    } else {
      summary += `No coverage data available. Run tests with coverage to generate metrics.\n`;
    }
    
    // Dependencies Section
    if (setup.dependencies.length > 0) {
      summary += `\n## Test Dependencies\n\n`;
      const mainDeps = ['jest', 'vitest', 'mocha', 'cypress', 'playwright'];
      const mainFound = setup.dependencies.filter((d: string) => mainDeps.some((m: string) => d.startsWith(m)));
      
      if (mainFound.length > 0) {
        summary += `**Main Testing Frameworks**:\n`;
        mainFound.forEach((dep: string) => summary += `- ${dep}\n`);
      }
      
      const utilDeps = setup.dependencies.filter((d: string) => !mainFound.includes(d));
      if (utilDeps.length > 0) {
        summary += `\n**Testing Utilities**:\n`;
        utilDeps.slice(0, 5).forEach((dep: string) => summary += `- ${dep}\n`);
        if (utilDeps.length > 5) {
          summary += `- ... and ${utilDeps.length - 5} more\n`;
        }
      }
    }
    
    // Recommendations Section
    summary += `\n## Recommendations\n\n`;
    
    const recommendations: string[] = [];
    
    if (!setup.framework) {
      recommendations.push('🔴 No test framework detected. Consider setting up Jest, Vitest, or another testing framework.');
    }
    
    if (setup.testFiles.length === 0) {
      recommendations.push('🔴 No test files found. Start writing tests for your code.');
    } else if (setup.testCount < 10) {
      recommendations.push('🟡 Low test count. Consider adding more test coverage.');
    }
    
    if (!coverage) {
      recommendations.push('🟡 No coverage data available. Configure coverage reporting in your test setup.');
    } else {
      if (coverage.lines.percentage < 60) {
        recommendations.push('🔴 Line coverage is below 60%. Aim for at least 80% coverage.');
      } else if (coverage.lines.percentage < 80) {
        recommendations.push('🟡 Line coverage is below 80%. Consider adding more tests.');
      }
      
      if (coverage.branches.percentage < 60) {
        recommendations.push('🟡 Branch coverage is low. Add tests for different code paths.');
      }
    }
    
    if (Object.keys(setup.coverageConfig).length === 0) {
      recommendations.push('🟡 No coverage configuration found. Set up coverage reporting.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Test setup looks good! Keep maintaining high standards.');
    }
    
    recommendations.forEach((rec: string) => {
      summary += `- ${rec}\n`;
    });
    
    return summary;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Test Analyzer MCP server running on stdio');
  }
}

const server = new TestAnalyzerServer();
server.run().catch(console.error);
