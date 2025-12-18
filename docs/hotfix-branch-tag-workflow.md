Hotfix Branch & Tag Workflow

Note: I use alot of aliases in my shell so I can work faster. I included the full command for those who don't have/use aliases

1. Fetch & Sync

```
gfop        # git fetch origin -p
gcom        # git checkout main
grbom       # git rebase origin/main
```

2. Branch from the last release tag

```
ghf v1.21.7     # git checkout tags/v1.21.7 -b hotfix/v1.21.7
```

3. Cherry-pick the required commits

```
gcp <sha1> <sha2>       #git cherry-pick
# or if you need a range
gcp <sha-old>^..<sha-new>
```

4. Push the hotfix branch back to repo

```
gpsup       #git push set-upstream
```

5. Tag the hotfix release

- In Github Actions
- Click on Create Release Tag
- Click Run workflow
- Change Branch to hotfix/v1.21.7
- Enter in updated tag version v1.21.8
- Run workflow
- Wait for Test deployment to complete

6. Create Prod Release

- Goto release page
- Click Draft a new release
- Select the newly created tag
- Enter in a appropriate Release title (use version i.e. v1.21.7)
- Click Publish release.

7. Merge hotfix tag back into main (VERSIONing)
   We need to merge back into main to keep versioning the same, we use --no-ff because it forces git to fast-forward the branch pointer in order
   to keep a clear history and relationship of the branches merged.

```
gcom        #git checkout main
gm --no-ff v1.21.8 -m "merge hotfix v1.21.8 back into main"     # no fastforward # git merge --no-ff v1.21.8 -m "merge hotfix v1.21.8 back into main"
gp          # git push origin main
```

8. Cleanup (no dangling branches)

```
gbD hotfix/v1.21.7      #git branch --delete --force hotfix/v1.21.7
gpo --delete hotfix/v1.21.7     #git push origin --delete hotfix/v1.21.7
```
