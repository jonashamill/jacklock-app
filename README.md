# Jaylock Installation Guide

## Prerequisites
- Node.js installed on your Mac
- npm (comes with Node.js)

## Installation Steps

1. **Create the script file**:
   Save the provided script as `jaylock.js` in a directory of your choice.

2. **Make the script executable**:
   ```bash
   chmod +x jaylock.js
   ```

3. **Install as a global command**:
   ```bash
   npm link
   ```
   
   Or you can create a symbolic link manually:
   ```bash
   sudo ln -s /full/path/to/jaylock.js /usr/local/bin/jaylock
   ```

## Alternative Installation Method

If you prefer a more permanent installation:

1. Create a new npm package:
   ```bash
   mkdir jaylock-app
   cd jaylock-app
   npm init -y
   ```

2. Edit the `package.json` file to add a bin entry:
   ```json
   {
     "name": "jaylock",
     "version": "1.0.0",
     "description": "Encrypted note-taking app",
     "main": "index.js",
     "bin": {
       "jaylock": "./jaylock.js"
     },
     "scripts": {
       "test": "echo \"Error: no test specified\" && exit 1"
     },
     "keywords": [],
     "author": "",
     "license": "ISC"
   }
   ```

3. Save the script as `jaylock.js` in the package directory

4. Install globally:
   ```bash
   npm install -g .
   ```

## How to Use

1. Open your terminal and type:
   ```bash
   jaylock
   ```

2. When prompted, enter your password
   - Each unique password creates a separate encrypted note file
   - The password is used to generate the encryption key
   - The password input is completely invisible as you type

3. In the editor interface:
   - Type text to add new lines
   - Use the following commands:
     - `:w` - Save changes
     - `:q` - Quit without saving
     - `:wq` - Save and quit
     - `:list` - Show all content with line numbers
     - `:edit <line>` - Load a line for editing (pre-fills with existing content)
     - `:edit <line> <text>` - Edit a specific line directly
     - `:delete <line>` - Delete a specific line
     - `:insert <line> <text>` - Insert text at a specific line
     - `:clear` - Clear all content (with confirmation)
     - `:help` - Show all available commands

4. Press Ctrl+C at any time to save and exit

5. Your notes are stored in the `~/.jaylock` directory in encrypted form

## Key Features

- **Password-Based Encryption**: Each password creates a separate encrypted note
- **Password Verification**: When creating a new note, you'll be asked to verify your password
- **Secure Storage**: Notes are encrypted with AES-256-CBC
- **Invisible Password Entry**: No characters are displayed while typing passwords
- **Line-by-Line Editing**: Full editing capabilities for your notes
- **Automatic Content Display**: See all content after any changes
- **Ctrl+C Protection**: Auto-saves when exiting with Ctrl+C