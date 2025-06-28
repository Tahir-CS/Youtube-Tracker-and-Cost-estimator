# Contributing to YouTube Tracker Cost Estimator

We love your input! We want to make contributing to YouTube Tracker Cost Estimator as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Coding Style

- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code formatting
- Use ES6+ features where appropriate
- Keep functions small and focused

## Setting Up Development Environment

1. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/youtube-tracker-cost-estimator.git
   cd youtube-tracker-cost-estimator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Testing

Before submitting a pull request, make sure to test your changes:

- Test the user interface thoroughly
- Verify API integrations work correctly
- Check that new features don't break existing functionality
- Test on different browsers if UI changes are made

## Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/yourusername/youtube-tracker-cost-estimator/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We welcome feature requests! Please provide:

- A clear description of the feature
- Why this feature would be useful
- How it should work
- Any examples of similar features in other applications

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

## Questions?

Don't hesitate to ask questions by creating an issue or reaching out to the maintainers.
