# Contributing to Monad IRC

Thank you for your interest in contributing to Monad IRC! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/monad-irc.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Follow the setup instructions in [SETUP.md](SETUP.md)

## Development Guidelines

### Code Style

- **TypeScript**: Use TypeScript for all new files
- **Naming Conventions**:
  - Components: PascalCase (e.g., `TerminalInput.tsx`)
  - Hooks: camelCase with `use` prefix (e.g., `useWallet.ts`)
  - Constants: UPPER_SNAKE_CASE (e.g., `API_URL`)
  - Functions: camelCase with descriptive names (e.g., `handleClick`)
  - Event handlers: prefix with `handle` (e.g., `handleSubmit`)

- **React Best Practices**:
  - Use functional components with hooks
  - Use early returns for cleaner code
  - Implement proper error handling
  - Add TypeScript types for all props and state

- **Styling**:
  - Use Tailwind CSS classes only
  - Avoid inline styles or CSS modules
  - Follow the retro terminal theme

- **Accessibility**:
  - Add proper ARIA labels
  - Support keyboard navigation
  - Use semantic HTML

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(terminal): add command history navigation
fix(wallet): resolve MetaMask connection issue
docs(readme): update setup instructions
```

### Testing

- Write tests for new features
- Ensure existing tests pass
- Test manually in the browser

### Pull Request Process

1. Update documentation if needed
2. Ensure your code follows the style guide
3. Test your changes thoroughly
4. Update README.md with any new features
5. Create a pull request with a clear description

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] All tests passing
```

## Areas for Contribution

### High Priority

- [ ] WebSocket integration for real-time updates
- [ ] Message encryption for private DMs
- [ ] Channel moderation features
- [ ] User profiles and avatars
- [ ] Mobile responsive design

### Medium Priority

- [ ] Custom themes and color schemes
- [ ] Command autocomplete
- [ ] Message search functionality
- [ ] User reputation system
- [ ] Notification system

### Low Priority

- [ ] Export chat history
- [ ] Emoji support
- [ ] GIF integration
- [ ] Voice messages
- [ ] File sharing

## Smart Contract Changes

If modifying smart contracts:

1. Write comprehensive tests
2. Test on testnet thoroughly
3. Document gas optimizations
4. Include security considerations
5. Update ABI in frontend

## Database Changes

If modifying the database schema:

1. Create migration scripts
2. Update schema documentation
3. Test migrations on dev database
4. Ensure backwards compatibility

## Bug Reports

When reporting bugs, include:

- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment details (browser, OS, etc.)
- Error messages and console logs

## Feature Requests

For feature requests:

- Explain the use case
- Describe the desired behavior
- Provide mockups if applicable
- Discuss potential implementation

## Questions and Support

- Check existing issues first
- Use GitHub Discussions for questions
- Join our Discord (if available)
- Be respectful and constructive

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Celebrated in community updates

Thank you for contributing to Monad IRC! 🚀

