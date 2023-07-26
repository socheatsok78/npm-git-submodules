import 'zx/globals'
import fs from 'fs-extra';
import minimist from 'minimist';

const vargv = minimist(process.argv.slice(2), {
  string: ['depth'],
  boolean: ['continue-on-error', 'dry-run', 'version', 'help', 'quiet'],
  alias: { v: 'version', h: 'help' },
  stopEarly: true,
});

async function group(name, cb = async () => {}) {
  console.group(name)
  await cb()
  console.groupEnd()
}

async function task(command = "") {
  if (!vargv["dry-run"]) {
    await $`${command}`
  } else {
    console.log(`$ ${command}`)
  }
}

const state = {
  gitmodules: "UNKNOWN",
}

async function run() {
  if (vargv["dry-run"]) {
    console.log("!!! Running in dry-run mode !!!")
  }

  try {
    await group("Checking for submodules...", async () => {
      if (!argv["dry-run"]) {
        const exists = fs.existsSync(".gitmodules")
        if (!exists) {
          if (argv["continue-on-error"]) {
            state.gitmodules = "NOT_FOUND"
            console.error("No .gitmodules file found")
            return
          }
          throw new Error("No .gitmodules file found")
        } else {
          state.gitmodules = "FOUND"
          console.log("Found .gitmodules file")
        }
      } else {
        console.log("No operation performed!")
      }
    })

    if (argv["continue-on-error"] && state.gitmodules === "NOT_FOUND") {
      console.log("No operation performed!")
      return
    }
    
    await group("Fetching submodules...", async () => {
      if (argv["dry-run"]) {
        console.log("No operation performed!")
      } else if (state.gitmodules === "FOUND") {
        await task("git submodule sync --recursive")
        await task("git -c protocol.version=2 submodule update --init --force --depth=1 --recursive")
        await task("git submodule foreach --recursive git config --local gc.auto 0")
      } else {
        console.log("[Skipped]")
      }
    })
  } catch (error) {
    console.error(error.msg || error.message || error)
    process.exit(1)
  }
}

run()
