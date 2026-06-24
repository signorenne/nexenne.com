---
title: "Undoing the last Git commit"
lang: en
translated_from: it
auto_translated: false
date: 2024-04-15
desc: "The difference between git revert and git reset when you need to undo the last commit."
read: "1 min"
tags: ["Git", "Control", "Command Line"]
categories: ["Management", "Tutorial"]
image: "/blog/covers/git_revert_commit.png"
---
## Introduction
Suppose you are working on a project with `Git`.
By mistake or distraction, you may create a commit that should not exist.
In that situation you need to undo it in the right way, choosing between two very different approaches.

The main commands are:

-   The `revert` command
-   The `reset` command

## The revert command
The `revert` command creates a new commit that reverses the changes from the commit we want to undo.

The basic form is:

```bash
git revert <commit to revert>
```

The usual steps are:

1.  Run the `git log` command.
2.  Find the commit you want to revert.
3.  Copy the alphanumeric hash of the commit to revert.
4.  Run `git revert <commit to revert>`.

Example.

```bash
cd project_with_a_dot_git_folder

git log
### Example of the git log output
#
# commit 2596f783998c8ec230b38a044b49e39d07770901 (HEAD -> main, origin/main)
# Author: Foo <foo@bar.com>
# Date:   Tue Apr 9 14:47:17 2024 +0200
#
#     Add something bad
#
# commit 2ce5e2e7e36f23673b32ccef7f908f161527142b
# Author: Foo <foo@bar.com>
# Date:   Tue Apr 2 23:33:27 2024 +0200
#
#     Update something

git revert 2ce5e2e7e36f23673b32ccef7f908f161527142b
```

After running the command, a new commit will be generated that reverses the earlier changes, without rewriting commit history.

![](/blog/images/git_revert_commit_before_revert.png)

![](/blog/images/git_revert_commit_after_revert.png)

## The reset command
The alternative is the `reset` command.
`git reset` rewrites local history, so it should be used carefully, especially if the commits have already been shared. It moves `HEAD` to the selected commit; what happens to files and the index depends on the option used.

### Soft reset
The `--soft` option moves `HEAD` while keeping the removed commit's changes staged in the index.

```bash
git reset --soft HEAD~1
```

![](/blog/images/fit_revert_commit_before_soft_reset.png)

![](/blog/images/fit_revert_commit_after_soft_reset.png)

### Hard reset
The `--hard` option aligns both the index and working tree with the selected commit, discarding local uncommitted changes too.

```bash
git reset --hard HEAD~1
```

![](/blog/images/git_revert_commit_before_hard_reset.png)

![](/blog/images/git_revert_commit_after_hard_reset.png)

## Conclusion
`git revert` is the safer choice for history that has already been shared, because it adds a new commit instead of rewriting existing ones. `git reset` is mainly useful for cleaning up local history before it is published.
