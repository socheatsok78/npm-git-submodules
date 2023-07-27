import fs from 'fs-extra';
import minimist from 'minimist';
import process from 'process';
import { $ } from 'zx'

const argv = minimist(process.argv.slice(2), {
  string: ['depth'],
  boolean: ['force', 'continue-on-error', 'dry-run', 'help'],
  stopEarly: true,
});

function help(){
  console.log(`
  Usage: git-submodule-update [options]

  Options:
    --force             Force update
    --depth             Set depth
    --continue-on-error Continue on error
    --dry-run           Dry run
    --help              Show help
  `)
}

async function group(name, cb = async () => {}) {
  console.group(name)
  await cb()
  console.groupEnd()
}

async function task(commands = []) {
  if (!argv["dry-run"]) {
    await $`${commands}`
  } else {
    console.log(`$ ${commands}`)
  }
}

async function run() {
  if (process.env.CI) {
    console.log("[Skipped] Running in CI mode!")
    return
  }

  try {
    const exists = fs.existsSync(".gitmodules")

    if (!exists) {
      throw new Error("No .gitmodules file found!")
    } else {
      console.log("Found .gitmodules file!")

      const extraArgs = []

      if (argv["force"]) {
        extraArgs.push("--force")
      }

      if (argv["depth"]) {
        extraArgs.push("--depth")
        extraArgs.push(argv["depth"])
      }

      await group("Fetching submodules", async () => {
        await task(["git", "submodule", "sync", "--recursive"])
        await task(["git", "-c", "protocol.version=2", "submodule", "update", "--init", "--recursive", ...extraArgs])
        await task(["git", "submodule", "foreach", "--recursive", "git config --local gc.auto 0"])
      })
    }
  } catch (error) {
    console.error(error.message || error)

    if (argv["continue-on-error"]) {
      process.exit(0)
    } else {
      process.exit(1)
    }
  }
}

if (argv["help"]) {
  help()
} else{
  run()
}
