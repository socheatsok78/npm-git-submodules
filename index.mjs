import fs from 'fs-extra';
import minimist from 'minimist';
import process from 'process';
import { $ } from 'zx'

const BLOCKLIST = {
  "ForkProcessId": "Fork" // https://git-fork.com
}

// Main
const argv = minimist(process.argv.slice(2), {
  string: ['depth'],
  boolean: ['force', 'continue-on-error', 'dry-run', 'help'],
  stopEarly: true,
});

if (argv["help"]) { help() } else { run() }

// Functions
function help() {
  console.log(`
  Usage: git-submodules [options]

  Options:
    --force             Skip all checks and force update
    --depth             Set submodule pull depth
    --continue-on-error
    --dry-run
    --help
  `)
}

async function run() {
  try {
    // Skip all checks if --force is passed
    if (!argv["force"]) {
      // Skip if running in CI mode
      if (process.env.CI) {
        console.warn("[IGNORE] Running in CI mode!")
        return
      }

      // Skip if running in an environment that is already configured to fetch submodules
      // To avoid duplicate fetches
      for (const key in process.env) {
        if (key in BLOCKLIST) {
          console.warn(`[IGNORE] Running in "${BLOCKLIST[key]}" environment!`)
          return
        }
      }
    }

    // Check if .gitmodules file exists
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

async function group(name, cb = async () => { }) {
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
