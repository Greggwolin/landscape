#!/usr/bin/env node
/**
 * Export Prototype Notes to Markdown
 *
 * This script reads prototype notes from the JSON file and exports them
 * to markdown documentation files for easy reference and AI context.
 *
 * Usage: node scripts/export-prototype-notes.js
 */

const fs = require('fs');
const path = require('path');

const NOTES_FILE = path.join(__dirname, '../data/prototype-notes.json');
const DOCS_DIR = path.join(__dirname, '../docs/09_session_notes/prototypes');

// Prototype metadata - maps IDs to directory paths
const PROTOTYPE_MAP = {
  'multifam-rent-roll-inputs': 'multifam/rent-roll-inputs',
  'coreui-lease-input': 'general/lease-input',
  'glide-parcel-grid': 'planning/parcel-grid',
  // Add more as prototypes are created
};

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function groupNotesByPrototype(notes) {
  const grouped = {};
  notes.forEach(note => {
    if (!grouped[note.prototypeId]) {
      grouped[note.prototypeId] = [];
    }
    grouped[note.prototypeId].push(note);
  });
  return grouped;
}

function exportNotesToMarkdown() {
  try {
    // Read notes file
    const notesData = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
    const groupedNotes = groupNotesByPrototype(notesData);

    console.log(`Found ${notesData.length} total notes for ${Object.keys(groupedNotes).length} prototypes\n`);

    // Export notes for each prototype
    Object.entries(groupedNotes).forEach(([prototypeId, notes]) => {
      const prototypePath = PROTOTYPE_MAP[prototypeId];

      if (!prototypePath) {
        console.log(`⚠️  No path mapping for prototype: ${prototypeId} (skipping)`);
        return;
      }

      const outputDir = path.join(DOCS_DIR, prototypePath);
      const outputFile = path.join(outputDir, 'feedback.md');

      // Create directory if it doesn't exist
      fs.mkdirSync(outputDir, { recursive: true });

      // Sort notes by timestamp (newest first)
      const sortedNotes = notes.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Generate markdown
      let markdown = `# User Feedback & Notes\n\n`;
      markdown += `**Prototype ID:** \`${prototypeId}\`\n`;
      markdown += `**Total Notes:** ${notes.length}\n`;
      markdown += `**Last Updated:** ${formatDate(sortedNotes[0].timestamp)}\n\n`;
      markdown += `---\n\n`;

      sortedNotes.forEach((note, index) => {
        markdown += `## Note ${sortedNotes.length - index}\n\n`;
        markdown += `**Date:** ${formatDate(note.timestamp)}\n`;
        markdown += `**ID:** \`${note.id}\`\n\n`;
        markdown += `${note.note}\n\n`;
        markdown += `---\n\n`;
      });

      // Write file
      fs.writeFileSync(outputFile, markdown, 'utf8');
      console.log(`✅ Exported ${notes.length} notes to: ${outputFile}`);
    });

    console.log(`\n✨ Export complete!`);

  } catch (error) {
    console.error('❌ Error exporting notes:', error.message);
    process.exit(1);
  }
}

// Run export
exportNotesToMarkdown();
