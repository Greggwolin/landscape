#!/usr/bin/env node

/**
 * Development Status Update Helper
 * 
 * Usage: node Documentation/update-status.js
 * 
 * This script helps maintain the App-Development-Status.md file
 * by providing interactive prompts for updating progress.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const STATUS_FILE = path.join(__dirname, 'App-Development-Status.md');

const PAGES = [
  'Home Dashboard',
  'Land Use Management', 
  'Planning Overview',
  'Parcel Detail',
  'Financial Modeling'
];

const STATUS_OPTIONS = [
  '❌ Not Started',
  '🟡 In Progress', 
  '✅ Complete'
];

const CATEGORIES = [
  'Design Status',
  'Functionality',
  'Mobile Ready',
  'Accessibility'
];

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function displayMenu() {
  console.log('\n📊 Development Status Update Tool\n');
  console.log('1. Update page status');
  console.log('2. Add new outstanding issue');
  console.log('3. Mark issue as completed');
  console.log('4. Add technical debt item');
  console.log('5. Update sprint goals');
  console.log('6. View current status summary');
  console.log('7. Exit');
  console.log();
}

async function updatePageStatus() {
  console.log('\n📄 Select a page to update:');
  PAGES.forEach((page, index) => {
    console.log(`${index + 1}. ${page}`);
  });
  
  const pageChoice = await askQuestion('\nEnter page number: ');
  const pageIndex = parseInt(pageChoice) - 1;
  
  if (pageIndex < 0 || pageIndex >= PAGES.length) {
    console.log('Invalid selection');
    return;
  }
  
  const selectedPage = PAGES[pageIndex];
  console.log(`\n📊 Updating: ${selectedPage}`);
  
  console.log('\nSelect category:');
  CATEGORIES.forEach((category, index) => {
    console.log(`${index + 1}. ${category}`);
  });
  
  const categoryChoice = await askQuestion('\nEnter category number: ');
  const categoryIndex = parseInt(categoryChoice) - 1;
  
  if (categoryIndex < 0 || categoryIndex >= CATEGORIES.length) {
    console.log('Invalid selection');
    return;
  }
  
  const selectedCategory = CATEGORIES[categoryIndex];
  console.log('\nSelect new status:');
  STATUS_OPTIONS.forEach((status, index) => {
    console.log(`${index + 1}. ${status}`);
  });
  
  const statusChoice = await askQuestion('\nEnter status number: ');
  const statusIndex = parseInt(statusChoice) - 1;
  
  if (statusIndex < 0 || statusIndex >= STATUS_OPTIONS.length) {
    console.log('Invalid selection');
    return;
  }
  
  const newStatus = STATUS_OPTIONS[statusIndex];
  console.log(`\n✅ Updated ${selectedPage} -> ${selectedCategory} -> ${newStatus}`);
  console.log('(Note: Manual update of the markdown file is still required)');
}

async function addOutstandingIssue() {
  console.log('\n📝 Add Outstanding Issue\n');
  
  console.log('Select page:');
  PAGES.forEach((page, index) => {
    console.log(`${index + 1}. ${page}`);
  });
  
  const pageChoice = await askQuestion('\nEnter page number: ');
  const pageIndex = parseInt(pageChoice) - 1;
  
  if (pageIndex < 0 || pageIndex >= PAGES.length) {
    console.log('Invalid selection');
    return;
  }
  
  const selectedPage = PAGES[pageIndex];
  const issueTitle = await askQuestion('Enter issue title: ');
  const issueDescription = await askQuestion('Enter issue description: ');
  const priority = await askQuestion('Enter priority (High/Medium/Low): ');
  
  console.log('\n📋 Issue Summary:');
  console.log(`Page: ${selectedPage}`);
  console.log(`Title: ${issueTitle}`);
  console.log(`Description: ${issueDescription}`);
  console.log(`Priority: ${priority}`);
  console.log('\n(Add this to the markdown file under the appropriate page section)');
}

async function viewStatusSummary() {
  console.log('\n📈 Current Status Summary');
  console.log('='.repeat(50));
  
  try {
    const statusContent = fs.readFileSync(STATUS_FILE, 'utf8');
    
    // Extract the progress table
    const tableStart = statusContent.indexOf('| Page/Feature |');
    const tableEnd = statusContent.indexOf('\n\n', tableStart);
    
    if (tableStart !== -1 && tableEnd !== -1) {
      const table = statusContent.substring(tableStart, tableEnd);
      console.log(table);
    } else {
      console.log('Could not extract status table from markdown file');
    }
  } catch (error) {
    console.log(`Error reading status file: ${error.message}`);
  }
  
  console.log('\n📅 Last updated: ' + new Date().toLocaleDateString());
}

async function updateLastModified() {
  try {
    let content = fs.readFileSync(STATUS_FILE, 'utf8');
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    content = content.replace(
      /\*Last Updated: .+?\*/,
      `*Last Updated: ${today}*`
    );
    
    fs.writeFileSync(STATUS_FILE, content, 'utf8');
    console.log(`✅ Updated last modified date to ${today}`);
  } catch (error) {
    console.log(`Error updating file: ${error.message}`);
  }
}

async function main() {
  let running = true;
  
  while (running) {
    displayMenu();
    const choice = await askQuestion('Enter your choice (1-7): ');
    
    switch (choice) {
      case '1':
        await updatePageStatus();
        break;
      case '2':
        await addOutstandingIssue();
        break;
      case '3':
        console.log('Feature coming soon...');
        break;
      case '4':
        console.log('Feature coming soon...');
        break;
      case '5':
        console.log('Feature coming soon...');
        break;
      case '6':
        await viewStatusSummary();
        break;
      case '7':
        await updateLastModified();
        running = false;
        break;
      default:
        console.log('Invalid choice');
    }
    
    if (running) {
      await askQuestion('\nPress Enter to continue...');
    }
  }
  
  rl.close();
  console.log('\n👋 Status update session ended');
}

main().catch(console.error);