# Contributing to Customer Data Enrichment Engine

## Welcome!

Thank you for considering contributing to the Customer Data Enrichment Engine. This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct.html). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)
- Redis 7 (or use Docker)

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then:
   git clone https://github.com/YOUR-USERNAME/customer-data-enrichment.git
   cd customer-data-enrichment
   ```

2. **Set up development tools**
   ```bash
   # Install Node.js dependencies
   cd api && npm install
   cd ../frontend && npm install

   # Start development services
   docker-compose up -d postgres redis
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

## Development Process

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Examples:
```
feat(api): add lead enrichment endpoint
fix(dashboard): resolve chart rendering issue
docs(readme): update installation instructions
```

## Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git fetch origin
   git rebase origin/develop
   ```

2. **Run tests**
   ```bash
   cd api && npm test
   ```

3. **Run linter**
   ```bash
   cd api && npm run lint
   ```

4. **Check formatting**
   ```bash
   cd api && npm run format
   ```

### Submitting

1. **Create Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill in the template

2. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] Tests pass locally
   ```

3. **Review Process**
   - At least 1 approval required
   - All CI checks must pass
   - Address all feedback

## Coding Standards

### TypeScript

```typescript
// Use explicit types
function calculateScore(lead: Lead): number {
  // ...
}

// Use interfaces for objects
interface Lead {
  id: string;
  email: string;
  score: number;
}

// Use async/await
async function enrichLead(leadId: string): Promise<Lead> {
  const lead = await getLead(leadId);
  return lead;
}
```

### Code Style

- Use ESLint configuration provided
- Run `npm run format` before committing
- Maximum line length: 100 characters
- Use semicolons
- Use single quotes for strings

### Comments

```typescript
// Good: Explains WHY, not what
// Calculate score based on company size and engagement
const score = calculateLeadScore(lead);

// Bad: Redundant comment
// This is a function that calculates score
function calculateScore(lead: Lead) {
```

## Testing Requirements

### Unit Tests

```typescript
describe('LeadService', () => {
  it('should create a new lead', async () => {
    const lead = await createLead(validLeadData);
    expect(lead.id).toBeDefined();
  });
});
```

### Test Coverage Requirements

| Type | Minimum |
|------|---------|
| Unit tests | 80% |
| Integration tests | 60% |
| Overall | 75% |

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage
```

## Documentation

### API Documentation

Update `API.md` when:
- Adding new endpoints
- Changing request/response format
- Modifying authentication requirements

### Code Documentation

Use JSDoc for public APIs:

```typescript
/**
 * Creates a new lead in the system.
 * 
 * @param leadData - The lead information to create
 * @returns The created lead with assigned ID
 * 
 * @throws {ValidationError} If lead data is invalid
 * @throws {DuplicateError} If lead already exists
 */
async function createLead(leadData: LeadInput): Promise<Lead> {
  // ...
}
```

### README Updates

Update `README.md` for:
- New features
- Changed configuration
- Updated installation steps

## Additional Notes

### Git Flow

```
main ─────●─────●─────●─────● (release)
           │     │     │     
develop ───●─────●─────●─────● (develop)
           │     │     │     
feature ───┴─────●─────┴─────● (feature branches)
           bugfix┘       hotfix┘
```

### Release Process

1. Create release branch from `develop`
2. Update version numbers
3. Run full test suite
4. Update changelog
5. Merge to `main`
6. Create GitHub release
7. Deploy to production

### Communication

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Slack**: #enrichment-engine-dev

Thank you for contributing!
