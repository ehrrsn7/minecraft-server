// ecosystem.config.js
const isWindows = process.platform === 'win32';

module.exports = {
   apps: [
      {
         name: 'minecraft-server',

         // On Windows, the SCRIPT is 'start.ps1', and the INTERPRETER is 'powershell'
         script: isWindows ? './start.ps1' : './start.sh',

         // Use 'interpreter_args' to pass arguments to PowerShell itself
         interpreter: isWindows ? 'powershell' : '/bin/bash',
         interpreter_args: isWindows ? '' : '',

         // 'args' are for your script (start.ps1), which likely needs none.
         args: '',

         cwd: './',
         autorestart: true,
         max_memory_restart: '2G',

         out_file: './logs/pm2-out.log',
         error_file: './logs/pm2-error.log',
         log_date_format: 'YYYY-MM-DD HH:mm:ss',

         // Remove this line for now to see the real error.
         stop_exit_codes: [0],
      },
   ],
};