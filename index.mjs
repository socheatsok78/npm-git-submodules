import fs from 'fs-extra';
import minimist from 'minimist';
import process from 'process';
import { $ } from 'zx'

const BLOCKLIST = {
  "ForkProcessId": "Fork" // https://git-fork.com
}

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
  try {
    // Skip if running in CI mode
    if (process.env.CI) {
      throw new Error("Running in CI mode!")
    }

    // Skip if running in an environment that is already configured to fetch submodules
    // To avoid duplicate fetches
    for (const key in process.env) {
      if (key in BLOCKLIST) {
        throw new Error(`Running in "${BLOCKLIST[key]}" environment!`)
      }
    }

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
    if (argv["continue-on-error"]) {
      console.error("[SKIPPED]", error.message || error)
      process.exit(0)
    } else {
      console.error(error.message || error)
      process.exit(1)
    }
  }
}

if (argv["help"]) {
  help()
} else{
  run()
}
