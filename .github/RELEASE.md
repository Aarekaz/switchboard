# Release Process

This document describes how to create releases for Switchboard.

## Prerequisites

1. **npm account** with publish rights to `@aarekaz` scope
2. **GitHub personal access token** with repo access (automatic via GITHUB_TOKEN)
3. **Local environment** set up with pnpm

## Automated Release (Recommended)

Releases are automated via GitHub Actions when you push a version tag.

### Step 1: Prepare Release

1. **Ensure main branch is up to date**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Verify all packages build**:
   ```bash
   pnpm build
   ```

3. **Run tests** (when available):
   ```bash
   pnpm test
   ```

4. **Review recent commits**:
   ```bash
   git log --oneline --since="2 weeks ago"
   ```

### Step 2: Determine Version

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.2.1 → 0.2.2): Bug fixes, small changes
- **Minor** (0.2.1 → 0.3.0): New features, backwards compatible
- **Major** (0.2.1 → 1.0.0): Breaking changes

### Step 3: Create and Push Tag

```bash
# Create annotated tag
git tag -a v0.3.0 -m "Release v0.3.0: Add Slack adapter"

# Push tag to GitHub (this triggers the release workflow)
git push origin v0.3.0
```

### Step 4: Monitor Release

1. Go to GitHub Actions: https://github.com/Aarekaz/switchboard/actions
2. Watch the "Release" workflow
3. If successful:
   - Packages published to npm
   - GitHub release created with changelog
   - Release notes generated automatically

### Step 5: Verify Release

```bash
# Check npm
npm view @aarekaz/switchboard version
npm view @aarekaz/switchboard-core version
npm view @aarekaz/switchboard-discord version
npm view @aarekaz/switchboard-slack version

# Test installation
mkdir test-install && cd test-install
pnpm add @aarekaz/switchboard
```

### Step 6: Announce

Share the release:
- Twitter/X
- Reddit (r/typescript, r/node)
- Dev.to
- Discord communities

## Manual Release (Fallback)

If automated release fails, you can publish manually.

### Prerequisites

```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami
```

### Publish Steps

```bash
# 1. Build packages
pnpm build

# 2. Update versions
pnpm version 0.3.0 --no-git-tag-version -r

# 3. Publish to npm
pnpm publish -r --access public

# 4. Create GitHub release manually
# Go to: https://github.com/Aarekaz/switchboard/releases/new
# - Tag: v0.3.0
# - Title: Release 0.3.0
# - Description: Copy from CHANGELOG or recent commits
```

## Release Checklist

Before creating a release, ensure:

- [ ] All CI checks pass on main branch
- [ ] Version number follows semver
- [ ] CHANGELOG.md updated (if exists)
- [ ] Breaking changes documented
- [ ] Examples work with new version
- [ ] README reflects new features
- [ ] Migration guide written (for breaking changes)

## Troubleshooting

### "npm ERR! 403 Forbidden"

**Cause**: Not authorized to publish to @switchboard scope

**Solution**:
1. Verify npm login: `npm whoami`
2. Check package.json `publishConfig`
3. Contact package owner for permissions

### "Version already exists"

**Cause**: Version already published to npm

**Solution**:
1. Check existing version: `npm view @aarekaz/switchboard-core versions`
2. Bump to next version
3. Delete and recreate git tag if needed:
   ```bash
   git tag -d v0.3.0
   git push origin :refs/tags/v0.3.0
   git tag -a v0.3.1 -m "Release v0.3.1"
   git push origin v0.3.1
   ```

### GitHub Action Fails

**Cause**: Various (build errors, test failures, npm token)

**Solution**:
1. Check GitHub Actions logs
2. Fix issues locally
3. Delete tag, fix, and recreate:
   ```bash
   git tag -d v0.3.0
   git push origin :refs/tags/v0.3.0
   # Fix issues, commit
   git tag -a v0.3.0 -m "Release v0.3.0"
   git push origin v0.3.0
   ```

## Setting Up npm Token

To enable automated publishing:

1. **Generate npm token**:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token"
   - Select "Automation" type
   - Copy the token

2. **Add to GitHub Secrets**:
   - Go to https://github.com/Aarekaz/switchboard/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: [paste token]
   - Click "Add secret"

## Release Cadence

Recommended schedule:

- **Patch releases**: As needed for bug fixes (no schedule)
- **Minor releases**: Every 2-4 weeks for new features
- **Major releases**: Only when necessary (breaking changes)

## Beta Releases

For testing before official release:

```bash
# Tag as beta
git tag -a v0.3.0-beta.1 -m "Beta release"
git push origin v0.3.0-beta.1

# Or manually publish with beta tag
pnpm publish -r --tag beta --access public
```

Install beta:
```bash
pnpm add @aarekaz/switchboard-core@beta
```

## Post-Release

After a successful release:

1. **Update documentation**:
   - Verify docs reflect new version
   - Update migration guides
   - Add new examples if needed

2. **Monitor issues**:
   - Watch for bug reports
   - Respond to questions
   - Plan hotfix if critical bugs found

3. **Plan next release**:
   - Review open issues
   - Prioritize features
   - Update roadmap

## Version History

Track releases:

| Version | Date | Type | Highlights |
|---------|------|------|------------|
| 0.1.0 | 2026-01-10 | Initial | Core + Discord adapter |
| 0.2.0 | 2026-01-12 | Minor | Discord fully functional |
| 0.3.0 | 2026-01-12 | Minor | Slack adapter + MessageRef |
| 0.4.0 | TBD | Minor | Teams adapter (planned) |
| 1.0.0 | TBD | Major | Production ready |

## Questions?

- Open an issue: https://github.com/Aarekaz/switchboard/issues
- Start a discussion: https://github.com/Aarekaz/switchboard/discussions
