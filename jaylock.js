#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

// Directory for storing encrypted notes
const NOTES_DIR = path.join(os.homedir(), '.jaylock');

// Ensure the notes directory exists
if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
}

// Function to generate encryption key from password
function generateKey(password) {
  return crypto.createHash('sha256').update(password).digest();
}

// Function to encrypt text
function encrypt(text, key) {
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Function to decrypt text
function decrypt(encryptedText, key) {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedData = textParts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Function to get the file path for a given password
function getNotesFilePath(password) {
  const passwordHash = crypto.createHash('md5').update(password).digest('hex');
  return path.join(NOTES_DIR, `${passwordHash}.enc`);
}

// Function to load notes from file
function loadNotes(password) {
  const key = generateKey(password);
  const filePath = getNotesFilePath(password);
  
  if (fs.existsSync(filePath)) {
    try {
      const encryptedData = fs.readFileSync(filePath, 'utf8');
      return decrypt(encryptedData, key);
    } catch (error) {
      console.error('Error decrypting notes. Possibly wrong password.');
      return '';
    }
  } else {
    return ''; // New file
  }
}

// Function to save notes to file
function saveNotes(notes, password) {
  const key = generateKey(password);
  const filePath = getNotesFilePath(password);
  const encryptedData = encrypt(notes, key);
  fs.writeFileSync(filePath, encryptedData);
}

// Function to create a readline interface
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// This utility function is used to get password input without displaying it on screen
function getPasswordFromUser() {
  return new Promise((resolve) => {
    process.stdout.write('Password: ');
    
    // Save the previous settings
    const prevRawMode = process.stdin.isRaw;
    
    // Get the raw stdin stream
    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    let password = '';
    
    process.stdin.on('data', function passwordListener(data) {
      const char = data.toString();
      
      // Ctrl+C
      if (char === '\u0003') {
        process.stdout.write('\n');
        process.exit(0);
      }
      
      // Enter key
      if (char === '\r' || char === '\n') {
        process.stdout.write('\n');
        process.stdin.setRawMode(prevRawMode);
        process.stdin.pause();
        process.stdin.removeListener('data', passwordListener);
        resolve(password);
        return;
      }
      
      // Backspace
      if (char === '\b' || char === '\x7f') {
        if (password.length > 0) {
          password = password.substring(0, password.length - 1);
        }
        return;
      }
      
      // Add to password (don't display)
      password += char;
    });
  });
}

// Function to display content with line numbers
function displayContent(lines) {
  console.log('\n--- Current Content ---');
  if (lines.length === 0) {
    console.log('(Empty file)');
  } else {
    lines.forEach((line, index) => {
      console.log(`${index + 1}: ${line}`);
    });
  }
  console.log('----------------------\n');
}

// Enhanced editor implementation with editing capabilities
function runEditor(initialContent, password) {
  // Split content into lines for easier editing
  let lines = initialContent ? initialContent.split('\n') : [];
  
  console.log('\n=== Jaylock Encrypted Notes ===');
  console.log('Commands:');
  console.log('  :w - Save changes');
  console.log('  :q - Quit without saving');
  console.log('  :wq - Save and quit');
  console.log('  :list - Show all content with line numbers');
  console.log('  :edit <line> - Edit a specific line with content pre-filled');
  console.log('  :edit <line> <text> - Edit a specific line directly');
  console.log('  :delete <line> - Delete a specific line');
  console.log('  :insert <line> <text> - Insert text at a specific line');
  console.log('  :clear - Clear all content (with confirmation)');
  console.log('  :help - Show these commands\n');
  
  // Display initial content
  if (lines.length > 0) {
    displayContent(lines);
  }
  
  const rl = createReadline();
  rl.setPrompt('jaylock> ');
  rl.prompt();
  
  // Set up SIGINT handler (Ctrl+C) to save and exit
  process.on('SIGINT', () => {
    console.log('\nSaving before exit...');
    const content = lines.join('\n');
    saveNotes(content, password);
    console.log('Notes saved successfully! Goodbye!');
    process.exit(0);
  });
  
  rl.on('line', (input) => {
    // Handle commands (they all start with ":")
    if (input.startsWith(':')) {
      if (input === ':q') {
        console.log('Quitting without saving...');
        rl.close();
        process.exit(0);
      } else if (input === ':w') {
        const content = lines.join('\n');
        saveNotes(content, password);
        console.log('Notes saved successfully!');
      } else if (input === ':wq') {
        const content = lines.join('\n');
        saveNotes(content, password);
        console.log('Notes saved successfully! Goodbye!');
        rl.close();
        process.exit(0);
      } else if (input === ':list') {
        displayContent(lines);
      } else if (input === ':help') {
        console.log('Commands:');
        console.log('  :w - Save changes');
        console.log('  :q - Quit without saving');
        console.log('  :wq - Save and quit');
        console.log('  :list - Show all content with line numbers');
        console.log('  :edit <line> - Edit a specific line with content pre-filled');
        console.log('  :edit <line> <text> - Edit a specific line directly');
        console.log('  :delete <line> - Delete a specific line');
        console.log('  :insert <line> <text> - Insert text at a specific line');
        console.log('  :clear - Clear all content (with confirmation)');
        console.log('  :help - Show these commands');
      } else if (input === ':clear') {
        // Set up a one-time listener for confirmation
        const originalPrompt = rl.getPrompt();
        rl.setPrompt('Are you sure you want to clear all content? (y/n): ');
        
        // Save the current 'line' event listener
        const originalLineListener = rl.listeners('line')[0];
        rl.removeListener('line', originalLineListener);
        
        // Add a temporary listener for the confirmation
        rl.once('line', (confirmation) => {
          if (confirmation.toLowerCase() === 'y' || confirmation.toLowerCase() === 'yes') {
            lines = [];
            console.log('All content has been cleared.');
            displayContent(lines);
          } else {
            console.log('Clear operation cancelled.');
          }
          
          // Restore the original listener and prompt
          rl.on('line', originalLineListener);
          rl.setPrompt(originalPrompt);
          rl.prompt();
        });
        
        // Show the confirmation prompt
        rl.prompt();
      } else if (input.startsWith(':edit ')) {
      const match = input.match(/^:edit\s+(\d+)$/);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        
        if (lineNum >= 1 && lineNum <= lines.length) {
          // Instead of replacing immediately, set up the readline to pre-fill with the line content
          const lineContent = lines[lineNum - 1];
          rl.line = lineContent;
          rl.cursor = lineContent.length;
          
          // Let the user know which line they're editing
          console.log(`Editing line ${lineNum}. Press Enter to confirm or Escape to cancel.`);
          
          // Create a one-time listener for the next line
          const originalPrompt = rl.getPrompt();
          rl.setPrompt(`edit:${lineNum}> `);
          
          // Force the readline to redisplay with the current line content
          rl._refreshLine();
          
          // Save the current 'line' event listener
          const originalLineListener = rl.listeners('line')[0];
          rl.removeListener('line', originalLineListener);
          
          // Add a temporary listener for this edit operation
          rl.once('line', (editedLine) => {
            // Update the line with the edited content
            lines[lineNum - 1] = editedLine;
            console.log(`Line ${lineNum} updated.`);
            
            // Automatically show the updated content
            displayContent(lines);
            
            // Restore the original listener and prompt
            rl.on('line', originalLineListener);
            rl.setPrompt(originalPrompt);
            rl.prompt();
          });
        } else {
          console.log(`Error: Line number must be between 1 and ${lines.length}.`);
          rl.prompt();
        }
      } else if (input.match(/^:edit\s+(\d+)\s+(.*)/)) {
        // Handle the case where text is provided directly: :edit <line> <text>
        const fullMatch = input.match(/^:edit\s+(\d+)\s+(.*)/);
        const lineNum = parseInt(fullMatch[1], 10);
        const newText = fullMatch[2];
        
        if (lineNum >= 1 && lineNum <= lines.length) {
          lines[lineNum - 1] = newText;
          console.log(`Line ${lineNum} updated.`);
          // Automatically show the updated content
          displayContent(lines);
        } else {
          console.log(`Error: Line number must be between 1 and ${lines.length}.`);
        }
        rl.prompt();
      } else {
        console.log('Usage: :edit <line number> [new text]');
        rl.prompt();
      }
    } else if (input.startsWith(':delete ')) {
      const match = input.match(/^:delete\s+(\d+)$/);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        
        if (lineNum >= 1 && lineNum <= lines.length) {
          lines.splice(lineNum - 1, 1);
          console.log(`Line ${lineNum} deleted.`);
          // Automatically show the updated content
          displayContent(lines);
        } else {
          console.log(`Error: Line number must be between 1 and ${lines.length}.`);
        }
      } else {
        console.log('Usage: :delete <line number>');
      }
    } else if (input.startsWith(':insert ')) {
      const match = input.match(/^:insert\s+(\d+)\s+(.*)/);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        const text = match[2];
        
        if (lineNum >= 1 && lineNum <= lines.length + 1) {
          lines.splice(lineNum - 1, 0, text);
          console.log(`Text inserted at line ${lineNum}.`);
          // Automatically show the updated content
          displayContent(lines);
        } else {
          console.log(`Error: Line number must be between 1 and ${lines.length + 1}.`);
        }
      } else {
        console.log('Usage: :insert <line number> <text>');
      }
      } else {
        console.log(`Unknown command: ${input}`);
      }
    } else {
      // Default: add the line to the content
      lines.push(input);
      // Automatically show the updated content after adding a line
      displayContent(lines);
    }
    
    rl.prompt();
  });

  rl.on('close', () => {
    // Also save on close
    const content = lines.join('\n');
    saveNotes(content, password);
    console.log('Notes saved. Goodbye!');
    process.exit(0);
  });
}

// Main application function
async function main() {
  try {
    // Get password from user (invisible input)
    const password = await getPasswordFromUser();
    
    // Check if this is a new file
    const filePath = getNotesFilePath(password);
    const isNewFile = !fs.existsSync(filePath);
    
    // If it's a new file, verify the password
    
    console.log('Please verify your password:');
    const verificationPassword = await getPasswordFromUser();
    
    if (password !== verificationPassword) {
    console.error('Passwords do not match. Please try again.');
    process.exit(1);
    }
    
    console.log('Password verified. Creating new encrypted note.');
    
    
    const notes = loadNotes(password);
    runEditor(notes, password);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

// Start the app
main();