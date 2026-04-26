import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import { spawn } from "child_process";
import os from "os";

let handler = async (m, { conn, command }) => {
  console.log("Command received:", command);

  try {
    // Step 1: Checking for updates
    await conn.reply(m.chat, "🔍 Checking for PRINCE-GDS updates...", m);
    console.log("Checking for updates...");

    // Load package.json
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    console.log("package.json loaded");

    // Fetch the latest commit hash from GitHub
    const { data: commitData } = await axios.get(
      "https://api.github.com/repos/Mr-GDs/prince-gds/commits/main",
      { timeout: 10000 }
    );
    const latestCommitHash = commitData.sha;
    console.log("Latest commit hash:", latestCommitHash);

    const currentHash = packageJson.commitHash || "unknown";
    console.log("Current commit hash:", currentHash);

    if (latestCommitHash === currentHash) {
      return await conn.reply(m.chat, "```✅ Your PRINCE-GDS bot is already up-to-date!```", m);
    }

    // Update process messages
    const progressMessages = [
      "PRINCE-GDS Bot Updating...🚀",
      "📦 Downloading the latest code...",
      "📦 Extracting the latest code...",
      "🔄 Replacing files (keeping config)...",
      "📥 Installing dependencies...",
      "🔄 Restarting the bot to apply updates...",
    ];

    await conn.reply(m.chat, progressMessages[0], m);

    // Create backup directory in working directory (NOT /tmp)
    const backupPath = path.join(process.cwd(), ".backup_" + Date.now());
    const filesToBackup = ["config.json", "sessions", ".env", "src"];
    
    console.log("Creating backup of critical files...");
    fs.mkdirSync(backupPath, { recursive: true });
    
    for (const file of filesToBackup) {
      const sourcePath = path.join(process.cwd(), file);
      if (fs.existsSync(sourcePath)) {
        const destPath = path.join(backupPath, file);
        try {
          if (fs.lstatSync(sourcePath).isDirectory()) {
            copyFolderSync(sourcePath, destPath);
          } else {
            fs.copyFileSync(sourcePath, destPath);
          }
          console.log(`  ✅ Backed up: ${file}`);
        } catch (backupErr) {
          console.warn(`  ⚠️  Could not backup ${file}:`, backupErr.message);
        }
      }
    }
    console.log("Backup created at:", backupPath);

    // Step 3: Download the latest code (ZIP)
    // Use working directory for extraction, not /tmp
    const zipFileName = `latest_${Date.now()}.zip`;
    const zipPath = path.join(process.cwd(), zipFileName);
    await conn.reply(m.chat, progressMessages[1], m);
    
    try {
      console.log("Downloading from GitHub...");
      const { data: zipData } = await axios.get(
        "https://github.com/Mr-GDs/prince-gds/archive/main.zip",
        { responseType: "arraybuffer", timeout: 60000 }
      );
      fs.writeFileSync(zipPath, zipData);
      console.log("Downloaded ZIP file:", zipFileName);
      await conn.reply(m.chat, "✅ Download completed", m);
    } catch (downloadError) {
      console.error("Download failed:", downloadError.message);
      throw new Error("Failed to download from GitHub: " + downloadError.message);
    }

    // Step 4: Extract the ZIP file
    const extractDirName = `latest_extract_${Date.now()}`;
    const extractPath = path.join(process.cwd(), extractDirName);
    try {
      console.log("Extracting ZIP to:", extractPath);
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);
      console.log("ZIP extracted successfully");
      await conn.reply(m.chat, progressMessages[2] + " ✅ Extraction complete", m);
    } catch (extractError) {
      console.error("Extraction failed:", extractError.message);
      // Cleanup zip file
      try { fs.unlinkSync(zipPath); } catch (e) {}
      throw new Error("Failed to extract ZIP: " + extractError.message);
    }

    // Step 5: Replace files (but preserve config)
    try {
      const sourcePath = path.join(extractPath, "prince-gds-main");
      
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source path not found: ${sourcePath}`);
      }

      console.log("Preparing file replacement...");
      
      // Files to skip during update
      const itemsToSkip = [
        "config.json", 
        "sessions", 
        ".env", 
        "node_modules", 
        ".git",
        ".backup_*"
      ];
      
      const items = fs.readdirSync(sourcePath);
      let replacedCount = 0;
      
      for (const item of items) {
        // Skip items in skip list
        if (itemsToSkip.some(skip => {
          if (skip.includes("*")) {
            const pattern = skip.replace("*", "");
            return item.startsWith(pattern);
          }
          return item === skip;
        })) {
          console.log(`  ⏭️  Skipping: ${item}`);
          continue;
        }
        
        const srcPath = path.join(sourcePath, item);
        const destPath = path.join(process.cwd(), item);
        
        try {
          // Remove old version if exists
          if (fs.existsSync(destPath)) {
            const stat = fs.lstatSync(destPath);
            if (stat.isDirectory()) {
              // Use rimraf style removal for directories
              fs.rmSync(destPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(destPath);
            }
            console.log(`  🗑️  Removed old: ${item}`);
          }
          
          // Copy new version
          const stat = fs.lstatSync(srcPath);
          if (stat.isDirectory()) {
            copyFolderSync(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
          replacedCount++;
          console.log(`  ✅ Updated: ${item}`);
        } catch (itemErr) {
          console.error(`  ❌ Error updating ${item}:`, itemErr.message);
          // Continue with other files
        }
      }
      
      console.log(`Files replaced successfully (${replacedCount} items)`);
      await conn.reply(m.chat, progressMessages[3] + ` ✅ Updated ${replacedCount} items`, m);
    } catch (replaceError) {
      console.error("File replacement failed:", replaceError.message);
      throw new Error("Failed to replace files: " + replaceError.message);
    }

    // Cleanup extracted files BEFORE npm install
    try {
      console.log("Cleaning up temporary extraction files...");
      fs.rmSync(extractPath, { recursive: true, force: true });
      fs.unlinkSync(zipPath);
      console.log("Temporary files cleaned up");
    } catch (cleanupError) {
      console.warn("Cleanup warning:", cleanupError.message);
    }

    // Step 6: Install dependencies
    try {
      await conn.reply(m.chat, progressMessages[4], m);
      console.log("Installing dependencies...");
      
      await new Promise((resolve, reject) => {
        const npm = spawn("npm", ["install", "--legacy-peer-deps", "--no-fund"], {
          cwd: process.cwd(),
          stdio: ["pipe", "pipe", "pipe"],
          shell: process.platform === "win32"
        });
        
        let npmOutput = "";
        npm.stdout.on("data", (data) => {
          npmOutput += data.toString();
          console.log("NPM:", data.toString().trim());
        });
        
        npm.stderr.on("data", (data) => {
          console.warn("NPM WARN:", data.toString().trim());
        });
        
        npm.on("close", (code) => {
          if (code === 0) {
            console.log("Dependencies installed successfully.");
            resolve();
          } else {
            reject(new Error(`npm install exited with code ${code}`));
          }
        });
        
        npm.on("error", (err) => {
          reject(err);
        });
        
        // Timeout after 5 minutes
        setTimeout(() => {
          npm.kill();
          reject(new Error("npm install timeout (5 minutes)"));
        }, 300000);
      });
      
      await conn.reply(m.chat, "✅ Dependencies installed", m);
    } catch (npmError) {
      console.error("NPM install warning:", npmError.message);
      await conn.reply(m.chat, "⚠️  NPM install issue (non-critical), continuing...", m);
    }

    // Step 7: Restart the bot
    await conn.reply(m.chat, progressMessages[5] + " ✅ Restarting bot", m);
    
    setTimeout(() => {
      console.log("Sending reset signal...");
      try {
        process.send("reset");
      } catch (e) {
        console.log("Reset signal method 1 failed, trying method 2...");
        process.exit(0);
      }
    }, 2000);

    await conn.reply(m.chat, "```✅ Bot updated successfully!\n\nRestarting in 10 seconds...```", m);

  } catch (error) {
    console.error("Update error:", error);
    
    const errorMsg = `❌ Update failed:\n\n${error.message}\n\n✅ Your configuration is safely backed up.\n\nTry: npm start`;
    
    try {
      await conn.reply(m.chat, errorMsg, m);
    } catch (replyError) {
      console.error("Failed to send error reply:", replyError.message);
    }
  }
};

// Helper function to copy directories and files recursively
function copyFolderSync(source, target) {
  try {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    const items = fs.readdirSync(source);
    for (const item of items) {
      // Skip node_modules and other large dirs
      if (["node_modules", ".git", ".github", ".gitignore"].includes(item)) {
        continue;
      }
      
      const srcPath = path.join(source, item);
      const destPath = path.join(target, item);
      const stat = fs.lstatSync(srcPath);
      
      if (stat.isDirectory()) {
        copyFolderSync(srcPath, destPath);
      } else if (stat.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error(`Error copying ${source}:`, error.message);
    throw error;
  }
}

handler.help = ["update"];
handler.tags = ["owner"];
handler.command = /^(update|upgrade|up)$/i;
handler.rowner = true;
export default handler;
