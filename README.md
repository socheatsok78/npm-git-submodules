# npm-git-submodules
A NPM hook for fetching git submodules

## Install

```sh
npm install --save-dev npm-git-submodules
```

## Usage

Here an example of using `git-submodules` hook in `package.json`:

```json
{
  "scripts": {
    "prepare": "git-submodules",
    // or
    "postinstall": "git-submodules"
  }
}
```

Or using with `gitHooks`:

```json
{
  "gitHooks": {
    "post-checkout": "git-submodules --continue-on-error"
  }
}
```

For usage help run:

```sh
npm run git-submodules -- --help
# or
yarn run git-submodules --help
```

## License
Licensed under the [MIT](LICENSE) license.
