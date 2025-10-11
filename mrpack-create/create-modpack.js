// Load environment variables from a .env file
require('dotenv').config();

const fetch = require('node-fetch');
const JSZip = require('jszip');
const fs = require('fs').promises;
const path = require('path');

// --- CONFIGURATION ---
// Get user, token, and pack details from environment variables or use defaults.
const MODRINTH_USER = process.env.MODRINTH_USER;
const MODRINTH_PAT = process.env.MODRINTH_PAT;
const MODPACK_NAME = 'My Followed Projects Pack';
const MODPACK_VERSION = '1.0.0';

// --- HELPER: Parse Command Line Arguments ---
// Allows you to run the script like: node create-modpack.js --mcVersion=1.20.1 --loader=fabric
const getArg = (argName) => {
   const arg = process.argv.slice(2).find(a => a.startsWith(`--${argName}=`));
   return arg ? arg.split('=')[1] : null;
};

// --- CORE SCRIPT LOGIC ---
async function main() {
   console.log('Starting modpack creation...');

   // 1. Validate environment variables and arguments
   if (!MODRINTH_USER || !MODRINTH_PAT) {
      console.error('Error: MODRINTH_USER and MODRINTH_PAT must be set in your .env file.');
      return;
   }

   const mcVersion = getArg('mcVersion');
   const loader = getArg('loader'); // e.g., "fabric" or "forge"

   if (!mcVersion || !loader) {
      console.error('Error: You must provide a Minecraft version and a loader.');
      console.error('Example: npm start -- --mcVersion=1.21 --loader=fabric');
      return;
   }
   console.log(`Targeting Minecraft ${mcVersion} with ${loader}.`);


   // 2. Fetch all followed projects
   console.log(`Fetching followed projects for user: ${MODRINTH_USER}...`);
   let followedProjects = [];
   try {
      const response = await fetch(`https://api.modrinth.com/v2/user/${MODRINTH_USER}/follows`, {
         headers: { 'Authorization': MODRINTH_PAT }
      });
      if (!response.ok) {
         throw new Error(`API responded with ${response.status}: ${await response.text()}`);
      }
      followedProjects = await response.json();
   } catch (error) {
      console.error('Failed to fetch followed projects:', error.message);
      return;
   }
   console.log(`Found ${followedProjects.length} followed projects.`);


   // 3. Find a compatible version for each project
   const filesForModpack = [];
   console.log('Finding compatible mod versions...');

   const promises = followedProjects.map(async (project) => {
      // Construct the API URL to find versions filtered by game version and loader
      // FIX: Use project.id instead of project.project_id
      const url = `https://api.modrinth.com/v2/project/${project.id}/version?loaders=["${loader}"]&game_versions=["${mcVersion}"]`;

      try {
         const versionResponse = await fetch(url);
         const versions = await versionResponse.json();

         if (versions.length > 0) {
            // Use the first (most recent) compatible version found
            const latestVersion = versions[0];
            const primaryFile = latestVersion.files.find(f => f.primary); // Usually the main JAR
            if (primaryFile) {
               console.log(`  (+) Found compatible version for: ${project.title}`);
               return {
                  path: `mods/${primaryFile.filename}`,
                  hashes: primaryFile.hashes,
                  downloads: [primaryFile.url],
                  fileSize: primaryFile.size,
               };
            }
         }
         console.log(`  (-) No compatible version found for: ${project.title}`);
         return null;
      } catch (error) {
         console.error(`Error fetching version for ${project.title}:`, error);
         return null;
      }
   });

   const resolvedFiles = await Promise.all(promises);
   const validFiles = resolvedFiles.filter(file => file !== null); // Filter out nulls (no compatible version)
   console.log(`Successfully found ${validFiles.length} compatible mods.`);


   // 4. Construct the modrinth.index.json file
   const modrinthIndex = {
      formatVersion: 1,
      game: 'minecraft',
      versionId: MODPACK_VERSION,
      name: MODPACK_NAME,
      summary: `A custom modpack generated from ${MODRINTH_USER}'s followed projects for Minecraft ${mcVersion}.`,
      dependencies: {
         'minecraft': mcVersion,
         [`${loader}-loader`]: '*' // Use a wildcard, the launcher will resolve the best version
      },
      files: validFiles,
   };


   // 5. Create the .mrpack zip archive
   console.log('Creating .mrpack file...');
   const zip = new JSZip();
   // Add the manifest file
   zip.file('modrinth.index.json', JSON.stringify(modrinthIndex, null, 2));
   // Add the mandatory, but empty, overrides folder
   zip.folder('overrides');

   const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
   const outputFileName = `${MODPACK_NAME.replace(/\s+/g, '-')}.mrpack`;

   await fs.writeFile(outputFileName, zipContent);
   console.log(`\n✅ Success! Modpack created: ${path.resolve(outputFileName)}`);
   console.log(`You can now import this file into the Modrinth App or another compatible launcher.`);
}

// Run the main function
main().catch(console.error);