# Contributing---

title: Contributing to Docs

Thank you for your interest in contributing to Agent SDK! This guide will help you get started.nav_exclude: true

---

## Ways to Contribute

# Contributing to Documentation

- **Bug Reports**: Open an issue with detailed reproduction steps

- **Feature Requests**: Describe the feature and its use case Pages live under `docs/` and are rendered by GitHub Pages with the Just the Docs theme.

- **Documentation**: Fix typos, clarify explanations, add examples Each page should start with YAML front matter including at least `title` and optionally `nav_order`.

- **Code**: Submit pull requests for bug fixes or new features Section landing pages use the directory `README.md` pattern.



## Development Setup## Local preview (optional)



### PrerequisitesYou can preview locally with Docker, without installing Ruby:



- Node.js >= 18.17```sh

- npm, pnpm, or yarndocker run --rm -p 4000:4000 -v "$PWD/docs":/site -w /site bretfisher/jekyll-serve

```

### Getting Started

Then open http://localhost:4000.

```bash

# Clone the repositoryIf you prefer Ruby:

git clone https://github.com/Cognipeer/agent-sdk

cd agent-sdk```sh

gem install bundler jekyll

# Install dependenciescd docs && bundle init && echo 'gem "just-the-docs"' >> Gemfile && bundle && bundle exec jekyll serve

npm install```



# Build the packageNote: GitHub Pages will build automatically on pushes to the default branch when Pages is enabled for this repo and the source is set to the `docs/` folder.

npm run build

# Run examples
npm run example:basic

# Run documentation locally
npm run docs:dev
```

## Project Structure

```
agent-sdk/
├── agent-sdk/          # Core SDK package
│   ├── src/           # Source code
│   └── package.json   # Package manifest
├── docs/              # VitePress documentation
│   ├── .vitepress/    # VitePress config
│   ├── guide/         # User guides
│   ├── api/           # API reference
│   └── examples/      # Example documentation
├── examples/          # Example applications
└── package.json       # Monorepo root
```

## Making Changes

### Code Changes

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/agent-sdk
   cd agent-sdk
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write clear, commented code
   - Follow existing code style
   - Add tests if applicable

4. **Test Your Changes**
   ```bash
   npm run build
   npm run example:basic  # Test with examples
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Describe what changed and why
   - Reference related issues
   - Wait for review

### Documentation Changes

Documentation uses VitePress and lives in the `docs/` directory.

1. **Run docs locally**
   ```bash
   npm run docs:dev
   ```

2. **Edit markdown files**
   - Guides: `docs/guide/`
   - API: `docs/api/`
   - Examples: `docs/examples/`

3. **Preview changes** at http://localhost:5173

4. **Submit PR** following the same process as code changes

## Code Style

- Use TypeScript for type safety
- Follow existing patterns and conventions
- Write clear comments for complex logic
- Keep functions small and focused
- Use descriptive variable names

## Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or tooling changes

Example: `feat: add support for custom model adapters`

## Testing

- Test changes with provided examples
- Add new examples for significant features
- Ensure builds pass: `npm run build`

## Documentation Guidelines

- Use clear, concise language
- Include code examples
- Link to related docs
- Test all code snippets
- Update API docs for interface changes

## Adding Examples

When adding a new example:

1. Create folder in `examples/`
2. Add TypeScript file with implementation
3. Add npm script in root `package.json`
4. Create documentation in `docs/examples/`
5. Update example index

## Questions?

- Open a [GitHub Discussion](https://github.com/Cognipeer/agent-sdk/discussions)
- Join our community chat (if available)
- Check existing issues and PRs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

Be respectful and constructive. We're all here to learn and build together.

---

Thank you for contributing to Agent SDK! 🎉
