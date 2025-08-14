# Test Analyzer MCP Server - Quick Reference

## 🚀 Quick Start Commands

Copy and paste these commands when talking to Claude with the test-analyzer MCP server enabled:

### Basic Commands

```
"Analyze the test setup for /path/to/your/project"
"Check test coverage for /path/to/your/project"
"Give me a test summary for /path/to/your/project"
```

### Real-World Examples

#### For a React Project
```
"Analyze the test setup for my React app at /Users/me/projects/my-react-app"
"Check if my React components have good test coverage"
"What testing libraries are installed in my React project?"
```

#### For a Vue Project
```
"Check the Vitest setup in /Users/me/vue-app"
"Run tests and check coverage for my Vue project"
"Are my Vue components properly tested?"
```

#### For a Node.js Project
```
"Analyze the Mocha test setup at /Users/me/api-server"
"Check test coverage for my Express API"
"How many integration tests do I have?"
```

## 📊 Coverage Specific Queries

### Check Existing Coverage
```
"What's the current test coverage for /path/to/project?"
"Show me the coverage breakdown by type (lines, branches, functions)"
"Is my project meeting the 80% coverage threshold?"
```

### Generate Fresh Coverage
```
"Run tests and generate new coverage data for /path/to/project"
"Execute test suite with coverage for my frontend app"
"Update coverage metrics by running all tests"
```

## 🔍 Detailed Analysis Queries

### Framework Detection
```
"What testing framework is used in /path/to/project?"
"Is Jest configured properly in my project?"
"Check if Cypress is set up for E2E testing"
```

### Test File Discovery
```
"Find all test files in /path/to/project"
"How many test files are in my src folder?"
"List all spec files in the project"
```

### Test Structure Analysis
```
"How many test suites are in my project?"
"Count the total number of tests"
"What testing hooks are being used?"
```

### Dependencies Check
```
"What testing dependencies are installed?"
"Check if @testing-library/react is installed"
"List all test-related packages and versions"
```

## 📈 Improvement Queries

### Get Recommendations
```
"Suggest improvements for my test setup"
"What can I do to improve code coverage?"
"Are there any testing best practices I'm missing?"
```

### Coverage Goals
```
"How far am I from 80% coverage?"
"Which type of coverage needs improvement?"
"What's my weakest coverage metric?"
```

## 🎯 Specific Scenarios

### New Project Setup
```
"Analyze if testing is properly configured in my new project"
"Check if I have all necessary testing dependencies"
"Verify my test configuration files are correct"
```

### CI/CD Preparation
```
"Is my project ready for CI with proper test coverage?"
"Check if coverage meets our team's standards"
"Generate a test report for code review"
```

### Debugging Test Issues
```
"Why is no test framework detected in my project?"
"Check if coverage reporting is configured"
"Verify test file patterns are correct"
```

## 💡 Pro Tips

### Comparative Analysis
```
"Compare test setup between /project1 and /project2"
"Which project has better coverage?"
```

### Targeted Analysis
```
"Check coverage just for the components folder"
"Analyze tests only for utility functions"
"Focus on integration test coverage"
```

### Monitoring Progress
```
"Check how coverage changed after adding new tests"
"Track coverage improvements over time"
"Verify coverage didn't decrease after refactoring"
```

## 📝 Output Formats

### JSON Format (Raw Data)
```
"Give me the raw test analysis data in JSON"
"Export coverage metrics as JSON"
```

### Summary Format (Human Readable)
```
"Provide a readable summary of test coverage"
"Generate a markdown report for documentation"
```

### Visual Format (With Emojis)
```
"Show coverage with visual indicators"
"Use emojis to show coverage status"
```

## 🔧 Troubleshooting Commands

```
"Why are no test files found?"
"Debug why coverage is showing 0%"
"Check if test configuration is valid"
"Verify test framework is properly installed"
```

## 📂 Common Project Paths

Replace these with your actual paths:
```
/Users/[username]/projects/[project-name]
/Users/[username]/dev/[repo-name]
/Users/[username]/Documents/[app-name]
./  (current directory)
../[sibling-project]
```

## ⚡ Quick Checks

One-liner commands for quick insights:
```
"Test count?"
"Coverage percentage?"
"Framework?"
"Any tests failing?"
"Coverage configured?"
```

---

Remember: The test-analyzer MCP server must be enabled in your Claude session for these commands to work!
