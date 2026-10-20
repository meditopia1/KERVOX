const fs = require('fs/promises');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const targets = [
  path.join(projectRoot, '.next'),
  path.join(projectRoot, 'tsconfig.tsbuildinfo'),
];

async function removeWithRetries(target, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await fs.rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
}

async function main() {
  for (const target of targets) {
    await removeWithRetries(target);
  }

  console.log('Cleaned frontend dev artifacts');
}

main().catch((error) => {
  console.error('Failed to clean frontend dev artifacts');
  console.error(error);
  process.exit(1);
});
