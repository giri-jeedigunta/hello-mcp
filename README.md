# Test Analyzer MCP Server

A Model Context Protocol (MCP) server that provides tools for analyzing unit test setups, checking coverage, and generating comprehensive test reports for JavaScript/TypeScript projects.

## Features

- 🔍 **Framework Detection**: Automatically detects Jest, Vitest, Mocha, Cypress, and Playwright
- 📊 **Coverage Analysis**: Detailed coverage metrics with visual feedback
- 📁 **Test Discovery**: Finds and analyzes all test files in your project
- 🎯 **Smart Recommendations**: Actionable insights to improve your testing strategy
- 🚀 **Frontend Focused**: Optimized for React, Vue, Angular, and other frontend frameworks

## Installation

The server is already configured in your MCP settings at:
```
/Users/venkatagiribabu.jeedigunta/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

## Available Tools

### 1. `analyze_test_setup`

Analyzes the complete unit test setup of a repository.

**Parameters:**
- `repoPath` (required): Path to the repository to analyze

**Returns:**
- Framework name (jest, vitest, mocha, etc.)
- List of test files found
- Total test count
- Test structure (suites, tests, hooks)
- Coverage configuration
- Testing dependencies
- Summary report

### 2. `check_coverage`

Checks test coverage for a repository with detailed metrics.

**Parameters:**
- `repoPath` (required): Path to the repository
- `runTests` (optional, default: false): Whether to run tests to generate fresh coverage data

**Returns:**
- Line coverage percentage
- Statement coverage percentage
- Function coverage percentage
- Branch coverage percentage
- Visual status indicators (✅ Good, ⚠️ Fair, ❌ Poor)
- Overall coverage summary

### 3. `get_test_summary`

Generates a comprehensive test analysis report.

**Parameters:**
- `repoPath` (required): Path to the repository

**Returns:**
- Complete test setup overview
- Coverage metrics with visual feedback
- Categorized dependencies
- Actionable recommendations
- Markdown-formatted report

## Sample Queries

Here are example queries you can use with Claude when this MCP server is active:

### Basic Analysis
```
"Analyze the test setup for the project at /Users/me/projects/my-react-app"

"Check what testing framework is being used in /path/to/project"

"Find all test files in my current project"
```

### Coverage Analysis
```
"Check the test coverage for /Users/me/projects/my-app"

"Run tests and get fresh coverage data for the project at /path/to/repo"

"What's the current test coverage status? Is it meeting the thresholds?"
```

### Comprehensive Reports
```
"Give me a complete test analysis report for /Users/me/projects/frontend-app"

"Generate a test summary with recommendations for improving coverage"

"Analyze the testing setup and suggest improvements"
```

### Specific Inquiries
```
"How many tests are in the project at /path/to/repo?"

"What testing dependencies are installed in this project?"

"Is coverage reporting configured properly?"

"Which test files have been created in this project?"
```

## Supported Test Frameworks

### Unit Testing
- **Jest** - Detected via jest.config.js, package.json
- **Vitest** - Detected via vitest.config.js, vite.config.js
- **Mocha** - Detected via .mocharc.js, .mocharc.json

### E2E Testing
- **Cypress** - Detected via cypress.config.js, cypress.json
- **Playwright** - Detected via playwright.config.js

## Supported Coverage Tools

- **Jest Coverage** (built-in)
- **NYC/Istanbul** (.nycrc, .nycrc.json)
- **C8** (V8 coverage)
- **Vitest Coverage** (@vitest/coverage-c8, @vitest/coverage-istanbul)

## Test File Patterns

The server automatically detects test files matching these patterns:
- `**/*.test.{js,jsx,ts,tsx}`
- `**/*.spec.{js,jsx,ts,tsx}`
- `**/__tests__/**/*.{js,jsx,ts,tsx}`
- `test/**/*.{js,jsx,ts,tsx}` (Mocha)
- `cypress/integration/**/*` (Cypress)
- `cypress/e2e/**/*` (Cypress)
- `**/*.cy.{js,jsx,ts,tsx}` (Cypress component tests)
- `tests/**/*.{js,jsx,ts,tsx}` (Playwright)
- `e2e/**/*.{js,jsx,ts,tsx}` (E2E tests)

## Coverage Thresholds

The server evaluates coverage based on these thresholds:
- ✅ **Good**: ≥ 80% coverage
- ⚠️ **Fair**: ≥ 60% coverage
- ❌ **Poor**: < 60% coverage

## Example Output

### Test Setup Analysis
```json
{
  "framework": "jest",
  "testFiles": ["src/__tests__/utils.test.js", "src/components/Button.test.tsx"],
  "testCount": 25,
  "testStructure": {
    "suites": 10,
    "tests": 25,
    "hooks": ["beforeEach", "afterEach"]
  },
  "dependencies": ["jest@29.5.0", "@testing-library/react@14.0.0"]
}
```

### Coverage Report
```
Coverage Summary:
- Lines: 85.5% ✅ Good
- Statements: 84.2% ✅ Good
- Functions: 78.9% ⚠️ Fair
- Branches: 72.3% ⚠️ Fair

Overall: ⚠️ Fair
```

### Recommendations
```
## Recommendations

- 🟡 Branch coverage is below 80%. Add tests for different code paths.
- 🟡 Function coverage could be improved. Consider testing utility functions.
- ✅ Line coverage is good! Keep maintaining high standards.
```

## Advanced Usage

### Analyzing Multiple Projects
You can analyze multiple projects in sequence:
```
"First analyze tests for /project1, then compare with /project2"
```

### CI/CD Integration Ideas
```
"Check if the coverage meets our 80% threshold for CI"
"Generate a test report for the pull request review"
```

### Test Improvement Workflow
```
1. "Analyze current test setup"
2. "Check which files have low coverage"
3. "Suggest test cases for uncovered branches"
4. "Re-run coverage after adding tests"
```

## Troubleshooting

### No Framework Detected
- Ensure package.json exists in the repository
- Check if test framework is in devDependencies
- Verify configuration files are present

### No Coverage Data Found
- Run tests with `runTests: true` parameter
- Ensure coverage is configured in test framework
- Check if coverage directory exists after running tests

### No Test Files Found
- Verify test files follow common naming patterns
- Check if tests are in excluded directories (node_modules, dist, build)
- Ensure file extensions match (.test.js, .spec.ts, etc.)

## Development

### Adding New Frameworks
To support additional test frameworks, update the `frameworks` array in the server implementation with:
- Framework name
- Configuration file patterns
- Test file patterns

### Extending Coverage Support
The server can be extended to support additional coverage formats by:
- Adding new file patterns to `coverageFiles` array
- Implementing parsers for specific coverage formats
- Supporting additional coverage reporters

## License

ISC

## Author

Created for analyzing frontend test setups and improving test coverage visibility.
