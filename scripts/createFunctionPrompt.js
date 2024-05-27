#!/usr/bin/env node

import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import ora from "ora";
import chalk from "chalk";

// Function to check if a string is camelCase
function isCamelCase(str) {
  return /^[a-z]+[A-Za-z0-9]*$/.test(str);
}

// Function to create project directory and files at the root of the project
function setupProject(functionName, functionType) {
  const dirPath = path.join(process.cwd(), functionName);
  const indexPath = path.join(dirPath, "index.ts");
  const packagePath = path.join(dirPath, "package.json");
  const tsConfigPath = path.join(dirPath, "tsconfig.json");

  // Create directory
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });

    // Create index.ts based on function type
    let indexContent = "";
    if (functionType === "http") {
      indexContent = `import { http } from "@google-cloud/functions-framework";
import { Request, Response } from "express";

http("${functionName}", (req: Request, res: Response) => {
  const body = req.body;
  console.log(body);
  res.status(200).json({ success: true, body: "hello from gcp" });
});
`;
    } else if (functionType === "event_driven") {
      indexContent = `import { cloudEvent } from "@google-cloud/functions-framework";
import { Firestore } from "@google-cloud/firestore";

const firestore = new Firestore();

cloudEvent("${functionName}", (cloudEvent) => {
  console.log("hello from cloudEvent function", cloudEvent);
});
`;
    }

    // Write index.ts content to file
    fs.writeFileSync(indexPath, indexContent);

    // Create package.json
    const tsConfigJson = {
      compilerOptions: {
        target: "ES2018",
        module: "CommonJS",
        allowJs: true,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        strict: true,
        skipLibCheck: true,
      },
      include: ["**/*.ts"],
    };

    // Create package.json
    const packageJson = {
      name: functionName,
      version: "1.0.0",
      main: "index.js",
      scripts: {
        build: "tsc",
        test: 'echo "Error: no test specified" && exit 1',
        start: `npm run build && functions-framework --target=${functionName} --source=.`,
      },
      keywords: [],
      author: "",
      license: "ISC",
      description: "",
      dependencies: {
        "@google-cloud/functions-framework": "^3.4.0",
        typescript: "^5.4.5",
        "@google-cloud/firestore": "^7.7.0",
      },
      devDependencies: {
        "@types/express": "^4.17.21",
      },
    };
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfigJson, null, 2));

    // Show a loading spinner while installing npm packages
    const spinner = ora("Installing npm packages...").start();

    // Automatically install npm packages
    exec(`npm install`, { cwd: dirPath }, (error, stdout, stderr) => {
      if (error) {
        spinner.fail(`Error installing npm packages: ${error.message}`);
        return;
      }
      spinner.succeed("Npm packages installed successfully");
      console.log(stdout);
      if (stderr) {
        console.error(`Error during npm install: ${stderr}`);
      }

      console.log(
        chalk.green(
          `\nProject for ${functionName} has been created successfully.`
        )
      );
      console.log(chalk.blue(`\nChange directory to the function folder:\n`));
      console.log(chalk.cyan(`  cd ${functionName}`));
      console.log(chalk.blue(`\nStart editing the function file:\n`));
      console.log(chalk.cyan(`  code index.ts`)); // Assumes using VS Code, adjust command for other editors
    });
  } else {
    console.error(chalk.red("\nProject directory already exists!"));
  }
}

// Main function to prompt user and create project
async function createFunctionPrompt() {
  const answers = await inquirer.prompt([
    {
      name: "functionName",
      type: "input",
      message: "Enter the function name:",
      validate: function (value) {
        if (value.length && isCamelCase(value)) {
          return true;
        } else if (!value.length) {
          return "Please enter a valid function name.";
        } else {
          return "Function name must be in camelCase format.";
        }
      },
    },
    {
      name: "functionType",
      type: "list",
      message: "Choose the function type:",
      choices: ["HTTP", "Event-driven"],
      filter: function (val) {
        return val.toLowerCase().replace("-", "_");
      },
    },
  ]);

  setupProject(answers.functionName, answers.functionType);
}

// Execute the prompt
createFunctionPrompt();
