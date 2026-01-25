# GitHub Actions Workflows

This directory contains automated CI/CD workflows for Terminal Zero Finance.

## Workflows

### Security Scan (`security.yml`)

**Purpose**: Automated security vulnerability scanning

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Weekly schedule (Mondays at 9am UTC)
- Manual workflow dispatch

**Jobs**:

1. **Snyk Security Scan**
   - Scans frontend and backend dependencies
   - Runs Snyk Code (SAST) analysis
   - Uploads results to GitHub Security tab
   - Requires `SNYK_TOKEN` secret

2. **NPM Audit**
   - Runs npm audit on frontend and backend
   - Generates detailed JSON reports
   - Uploads reports as artifacts (30-day retention)

3. **Dependency Review**
   - Analyzes new dependencies in pull requests
   - Fails on moderate+ severity vulnerabilities
   - Blocks GPL-3.0 and AGPL-3.0 licenses

**Required Secrets**:
- `SNYK_TOKEN`: Snyk API token (get from https://snyk.io)

**Setup**:
1. Create a Snyk account at https://snyk.io
2. Generate an API token in account settings
3. Add to GitHub: Settings → Secrets and variables → Actions → New repository secret
4. Name: `SNYK_TOKEN`, Value: your token

**Viewing Results**:
- GitHub Security tab: Shows Snyk findings
- Actions tab: View workflow runs and logs
- Artifacts: Download npm audit reports

**Configuration**:
- Fail threshold: High severity
- Matrix strategy: Scans frontend and backend separately
- Continue on error: Won't block builds on vulnerabilities

## Adding New Workflows

1. Create a new `.yml` file in this directory
2. Follow GitHub Actions syntax
3. Test locally with `act` if possible
4. Document in this README

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Snyk GitHub Actions](https://github.com/snyk/actions)
- [Security Hardening Guide](https://docs.github.com/en/actions/security-guides)
