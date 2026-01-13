# Documentation & Release Setup Guide

This guide explains all the documentation and automation created for Switchboard.

## What Was Created

### 1. Architecture Decision Records (ADRs)

Location: `docs/adr/`

Five comprehensive ADRs documenting key architectural decisions:

- **ADR-001**: MessageRef Type Pattern - Why we use `string | UnifiedMessage`
- **ADR-002**: LRU Cache Strategy - Message context caching for Slack
- **ADR-003**: Auto-Registration Pattern - Side-effect imports for adapters
- **ADR-004**: Result Type Pattern - Explicit error handling
- **ADR-005**: Emoji Mapping Strategy - Cross-platform emoji support

**Purpose**: Help future contributors understand "why" decisions were made

**When to add new ADRs**: When making significant architectural changes

---

### 2. Contributing Guide

Location: `CONTRIBUTING.md`

Comprehensive guide covering:
- Development setup
- Project structure
- Development workflow
- Testing guidelines
- Coding standards
- Commit message conventions
- Pull request process
- How to add new platform adapters

**Purpose**: Help contributors get started quickly

---

### 3. API Reference

Location: `docs/api/README.md`

Complete API documentation including:
- Umbrella package (@aarekaz/switchboard)
- Core package (@aarekaz/switchboard-core)
- Discord adapter (@aarekaz/switchboard-discord)
- Slack adapter (@aarekaz/switchboard-slack)
- All interfaces, types, and methods
- Usage examples
- Best practices

**Purpose**: Reference documentation for developers using Switchboard

---

### 4. Automated Release Workflow

Location: `.github/workflows/`

Three GitHub Actions workflows:

#### release.yml
Triggers on version tags (e.g., `v0.3.0`):
- Builds all packages
- Runs tests
- Publishes to npm
- Creates GitHub release
- Generates changelog

#### ci.yml
Runs on pull requests and pushes to main:
- Tests on Node 18, 20, 21
- Type checking
- Linting
- Build verification

#### Release Guide
Location: `.github/RELEASE.md`
- Step-by-step release process
- Troubleshooting guide
- Version history

**Purpose**: Automated, consistent releases

---

## How to Use

### For Development

1. **Read ADRs before making architectural changes**:
   ```bash
   ls docs/adr/
   ```

2. **Follow CONTRIBUTING.md for contributions**:
   - Check coding standards
   - Review commit message format
   - Understand PR process

3. **Reference API docs when integrating**:
   - Browse `docs/api/README.md`
   - Check interface definitions
   - Review examples

### For Releases

#### Automated Release (Recommended)

```bash
# 1. Ensure main is clean and tested
git checkout main
git pull
pnpm build
pnpm test

# 2. Create and push version tag
git tag -a v0.3.0 -m "Release v0.3.0: Add X feature"
git push origin v0.3.0

# 3. GitHub Actions automatically:
#    - Publishes to npm
#    - Creates GitHub release
#    - Generates changelog
```

#### Manual Release (if automation fails)

Follow `.github/RELEASE.md` for detailed steps.

---

## Next Steps

### Before First Release

1. **Set up npm token**:
   - Generate token at https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Add to GitHub secrets as `NPM_TOKEN`

2. **Verify package.json files**:
   ```json
   {
     "publishConfig": {
       "access": "public"
     }
   }
   ```

3. **Test release process**:
   - Create beta tag: `v0.3.0-beta.1`
   - Verify it publishes correctly
   - Delete beta if needed

### For Contributors

1. **Read CONTRIBUTING.md first**
2. **Check existing ADRs** before proposing architectural changes
3. **Reference API docs** when adding features
4. **Follow commit conventions** for clean history

### For Maintainers

1. **Update ADRs** when making architectural decisions
2. **Keep API docs in sync** with code changes
3. **Use release workflow** for all releases
4. **Review PRs** against CONTRIBUTING.md guidelines

---

## File Structure Overview

```
switchboard/
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   │   ├── README.md          # ADR index
│   │   ├── 001-message-ref-pattern.md
│   │   ├── 002-lru-cache-strategy.md
│   │   ├── 003-auto-registration-pattern.md
│   │   ├── 004-result-type-pattern.md
│   │   └── 005-emoji-mapping-strategy.md
│   ├── api/                    # API Reference
│   │   └── README.md          # Complete API documentation
│   └── SETUP_GUIDE.md         # This file
├── .github/
│   ├── workflows/
│   │   ├── ci.yml             # Continuous Integration
│   │   └── release.yml        # Automated releases
│   └── RELEASE.md             # Release process guide
└── CONTRIBUTING.md            # Contribution guidelines
```

---

## Documentation Maintenance

### When to Update

- **ADRs**: When making new architectural decisions
- **API docs**: When changing public APIs
- **CONTRIBUTING.md**: When changing dev workflow
- **RELEASE.md**: When changing release process

### How to Update

1. **ADRs**: Create new numbered ADR, update index
2. **API docs**: Edit `docs/api/README.md`
3. **Contributing**: Edit root `CONTRIBUTING.md`
4. **Release guide**: Edit `.github/RELEASE.md`

---

## Quick Reference

### Creating a Release

```bash
# Determine version (0.2.1 → 0.3.0 for new features)
git tag -a v0.3.0 -m "Release v0.3.0"
git push origin v0.3.0
```

### Adding an ADR

```bash
cd docs/adr
cp 001-message-ref-pattern.md 006-your-decision.md
# Edit the file
# Update README.md index
```

### Checking API Docs

```bash
# View in browser (if using live server)
open docs/api/README.md

# Or use grep to find specific APIs
grep -r "sendMessage" docs/api/
```

---

## Success Metrics

Good documentation should:
- [ ] Help new contributors get started in <30 minutes
- [ ] Answer "why" questions via ADRs
- [ ] Provide clear API examples
- [ ] Enable releases without manual intervention
- [ ] Reduce repetitive questions in issues

---

## Questions?

If you're unsure about:
- **Architectural decisions**: Read relevant ADR
- **Contributing**: Check CONTRIBUTING.md
- **Using the API**: See docs/api/README.md
- **Releasing**: Follow .github/RELEASE.md

Still stuck? Open a GitHub issue or discussion!
