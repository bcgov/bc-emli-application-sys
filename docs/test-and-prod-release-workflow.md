# Test and Prod Release Workflow

This document describes the end-to-end GitHub UI release flow for this repo.

## Workflow mapping

- **Create tag manually**: `Create Release Tag` workflow
- **Deploy to Test automatically**: `Deploy Test Environment` on tag push `v*.*.*`
- **Deploy to Prod automatically**: `Deploy Prod Environment` on GitHub Release `published`

---

## 1) Prepare release version

1. Confirm the code to release is merged to the target branch (`main` for normal releases, `hotfix/*` for hotfixes).
2. Pick the next version in semver format.
   - Example: `v1.33.0`

---

## 2) Create release tag (GitHub Actions)

1. Go to **GitHub → Actions**.
2. Open **Create Release Tag**.
3. Click **Run workflow**.
4. Select branch:
   - `main` for normal release
   - `hotfix/<version>` for hotfix release
5. In **Tag Version**, enter version number (for example `1.33.0`).
6. Click **Run workflow** and wait for completion.

Expected outcome:

- A git tag `v1.33.0` is created.
- Test deployment workflow is triggered automatically.

---

## 3) Test release deployment

1. Go to **Actions → Deploy Test Environment**.
2. Open the run for the new tag and wait for all jobs to pass.
3. Verify test environment smoke checks (login, key pages, critical flows).

If test fails:

- Fix issue in code.
- Create a new patch tag (for example `v1.33.1`).
- Repeat from Step 2.

---

## 4) Publish Prod release (GitHub Releases)

1. Go to **GitHub → Releases**.
2. Click **Draft a new release**.
3. Select the tag that passed test (for example `v1.33.0`).

### Important UI notes

- After you select a **Tag**, the **branch dropdown disappears**. This is expected.
- Select the **Previous Tag** as the compare baseline (the previously released Prod version).
- Click **Generate release notes**.
- The **Release Title** will auto-populate with the selected tag name (this is desired).
- Update the generated changelog to remove `chore` commits before publishing.

4. Click **Publish release**.

Expected outcome:

- Publishing the release triggers **Deploy Prod Environment** automatically.

---

## 5) Verify production deployment

1. Go to **Actions → Deploy Prod Environment**.
2. Confirm the run completes successfully.
3. Perform production smoke checks.
4. Announce release completion.

---

## Hotfix notes (if applicable)

See [Hotfix Branch & Tag Workflow](hotfix-branch-tag-workflow.md) for details on how to create hotfix branches and tags.
