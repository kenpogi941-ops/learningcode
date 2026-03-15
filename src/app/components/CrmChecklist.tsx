'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createBatch,
  deleteBatch,
  createChecklistItem,
  toggleItemState,
  deleteChecklistItem,
  clearAllChecklistItems,
  exportDatabaseBackup,
  importDatabaseBackup,
  logout,
} from '../actions';
import { format, parse, differenceInMinutes } from 'date-fns';
import { Plus, X, LogOut } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Batch {
  id: number;
  name: string;
}

interface Item {
  id: number;
  subitem: string;
  label: string;
  date: string;
  time: string;
  gap: string;
  time_ok: boolean;
  crm_ok: boolean;
  done: boolean;
}

export default function CrmChecklist({
  initialBatches,
  initialItems,
  selectedBatchId,
}: {
  initialBatches: Batch[];
  initialItems: Item[];
  selectedBatchId: number | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  
  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
  // Import Details State
  const [workflowName, setWorkflowName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [organization, setOrganization] = useState('');
  const [casinoName, setCasinoName] = useState('');
  const [campaignDates, setCampaignDates] = useState('');

  // Selected batch state managed by URL usually, but we can do a push
  const handleBatchSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      router.push(`/?batch=${val}`);
    } else {
      router.push('/');
    }
  };

  // Batches
  const [newBatchName, setNewBatchName] = useState(
    initialBatches.length > 0 ? initialBatches[0].name : 'JACKSON-0426CT REMINDER SEQUENCE'
  );

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) return;
    const res = await createBatch(newBatchName.trim());
    if (res.success && res.id) {
      router.push(`/?batch=${res.id}`);
    } else {
      alert(res.error || 'Failed to create batch');
    }
  };

  const handleDeleteBatch = async () => {
    if (!selectedBatchId) return;
    if (confirm('Delete this batch?')) {
      await deleteBatch(selectedBatchId);
      router.push('/');
    }
  };

  const handleClearAll = async () => {
    if (!selectedBatchId) return;
    if (confirm('Clear all items?')) {
      await clearAllChecklistItems(selectedBatchId);
      router.refresh();
    }
  };

  const handleCopyAll = () => {
    const text = initialItems
      .map(
        (i) =>
          `${i.done ? '[x]' : '[ ]'} ${i.subitem} - ${i.label} - ${i.date} ${i.time}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  // Checklist Adding
  const [subitem, setSubitem] = useState('');
  const [label, setLabel] = useState('Text Reminder');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('10:00');

  const computeGap = (prevItems: Item[], newDateStr: string, newTimeStr: string): string => {
    if (prevItems.length === 0) return '0hrs';
    
    const currentItem = prevItems[prevItems.length - 1]; 
    try {
      const formatStr = 'MMM d, yyyy h:mm a';
      const prevDate = parse(`${currentItem.date} ${currentItem.time}`, formatStr, new Date());
      const newDate = parse(`${newDateStr} ${newTimeStr}`, formatStr, new Date());
      
      const diffMinutes = Math.abs(differenceInMinutes(newDate, prevDate));
      if (isNaN(diffMinutes)) return '0hrs';

      const diffHoursExact = diffMinutes / 60;
      const formattedHours = Number(diffHoursExact.toFixed(2));

      if (formattedHours < 24) {
        return `${formattedHours}hrs`;
      }
      const days = Math.floor(formattedHours / 24);
      const hours = Number((formattedHours % 24).toFixed(2));
      return `${formattedHours}hrs / ${days}d ${hours}hrs`;
    } catch {
      return '0hrs';
    }
  };

  const processImportText = async () => {
    if (!selectedBatchId) return;
    const lines = importText.split('\n').filter(line => line.trim().length > 0);
    const currentItems = [...initialItems];
    let addedCount = 0;

    for (let line of lines) {
      line = line.trim();
      
      // Filter out garbage lines that don't look remotely like schedule items
      if (!line || line.length < 5) continue;
      if (!/[A-Za-z]+\s*\d{1,2}/.test(line) && !/\d{1,2}:\d{2}/.test(line)) continue; // Must have some date or time format or it's garbage
      
      let rawLabel = 'Text Reminder';
      const lowercaseLine = line.toLowerCase();
      if (lowercaseLine.includes('call')) rawLabel = 'Call Reminder';
      if (lowercaseLine.includes('email')) rawLabel = 'Email Reminder';
      if (lowercaseLine.includes('warm up')) rawLabel = 'Warm Up';
      if (lowercaseLine.includes('dynamic')) rawLabel = 'Dynamic Call';
      if (lowercaseLine.includes('special')) rawLabel = 'Special Text';
      if (lowercaseLine.includes('event')) rawLabel = 'Event Day';

      // Find Date
      const dateMatchStr = line.replace(/[^\w\s,:/-]/g, ' '); // Clean garabage from line
      const dateMatch = dateMatchStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?,?\s*\d{4}/i);
      let rawDate = '';
      if (dateMatch) rawDate = dateMatch[0];

      // Find Time
      const timeMatch = dateMatchStr.match(/(0?[1-9]|1[0-2])\s*:\s*[0-5][0-9]\s*[APap][Mm]\b/);
      let rawTime = '';
      if (timeMatch) rawTime = timeMatch[0];

      // Reformat string to remove known parts to get Subitem name
      let rawSubitem = line;
      if (dateMatch) rawSubitem = rawSubitem.replace(dateMatch[0], '');
      if (timeMatch) rawSubitem = rawSubitem.replace(timeMatch[0], '');
      
      // Remove labels
      rawSubitem = rawSubitem.replace(/Call Reminder/ig, '');
      rawSubitem = rawSubitem.replace(/Text Reminder/ig, '');
      rawSubitem = rawSubitem.replace(/Email Reminder/ig, '');
      rawSubitem = rawSubitem.replace(/Warm Up/ig, '');
      rawSubitem = rawSubitem.replace(/Dynamic Call/ig, '');
      rawSubitem = rawSubitem.replace(/Special Text/ig, '');
      rawSubitem = rawSubitem.replace(/Event Day/ig, '');
      
      // Output cleanup
      // Output cleanup
      rawSubitem = rawSubitem.trim().replace(/^[^a-zA-Z0-9]+/, '');
      if (!rawSubitem) rawSubitem = 'Unknown Task';

      // Advanced fallback date logic:
      // Use previous item's date if current line is missing a date.
      if (!rawDate) {
        if (currentItems.length > 0) {
          rawDate = currentItems[currentItems.length - 1].date;
        } else {
          rawDate = format(new Date(), 'MMM d, yyyy');
        }
      } else {
         try {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
               rawDate = format(d, 'MMM d, yyyy');
            }
         } catch {}
      }

      if (!rawTime) {
        rawTime = '10:00 AM';
      }

      rawTime = rawTime.toUpperCase();

      const gap = computeGap(currentItems, rawDate, rawTime);
      
      await createChecklistItem({
        batch_id: selectedBatchId,
        subitem: rawSubitem,
        label: rawLabel,
        date: rawDate,
        time: rawTime,
        gap,
      });

      currentItems.push({
          id: Date.now() + addedCount, 
          subitem: rawSubitem,
          label: rawLabel,
          date: rawDate,
          time: rawTime,
          gap,
          done: false,
          time_ok: false,
          crm_ok: false
      } as Item);
      
      addedCount++;
    }
    
    setImportModalOpen(false);
    setImportText('');
    router.refresh();
    
    if (addedCount > 0) {
      alert(`Successfully added ${addedCount} items!`);
    } else {
      alert("No valid items could be parsed. Please check the text format.");
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return alert('Select or create a batch first');
    if (!subitem || !dateStr || !timeStr) return alert('Fill required fields');

    const formattedDate = format(new Date(dateStr), 'MMM d, yyyy');
    let formattedTime = timeStr;
    try {
      const [hour, min] = timeStr.split(':');
      let h = parseInt(hour, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      formattedTime = `${h}:${min} ${ampm}`;
    } catch {}

    const gap = computeGap(initialItems, formattedDate, formattedTime);

    await createChecklistItem({
      batch_id: selectedBatchId,
      subitem,
      label,
      date: formattedDate,
      time: formattedTime,
      gap,
    });

    setSubitem('');
    // Optionally keep date/time or reset
  };

  const handleToggle = async (id: number, field: 'done' | 'time_ok' | 'crm_ok', currentState: boolean) => {
    startTransition(async () => {
      await toggleItemState(id, field, currentState);
      router.refresh(); // Rely on Next.js mutations
    });
  };

  const handleDeleteItem = async (id: number) => {
    startTransition(async () => {
      await deleteChecklistItem(id);
      router.refresh();
    });
  };


  const handleGeneratePDF = () => {
    if (initialItems.length === 0) {
      alert("No items to export in this batch.");
      return;
    }

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text('CRM Checklist Report', 14, 22);

    // Metadata Details
    doc.setFontSize(11);
    doc.setTextColor(100);
    
    let yPos = 32;
    doc.text(`Workflow Name: ${workflowName || 'N/A'}`, 14, yPos);
    yPos += 7;
    doc.text(`Assigned To: ${assignedTo || 'N/A'}`, 14, yPos);
    yPos += 7;
    doc.text(`Organization: ${organization || 'N/A'}`, 14, yPos);
    yPos += 7;
    doc.text(`Casino Name: ${casinoName || 'N/A'}`, 14, yPos);
    yPos += 7;
    doc.text(`Campaign Dates: ${campaignDates || 'N/A'}`, 14, yPos);
    yPos += 12;

    // Table Content
    const tableColumn = ["Status", "Task", "Label", "Date", "Time", "Gap"];
    const tableRows: Array<string[]> = [];

    initialItems.forEach(item => {
      const itemData = [
        item.done ? 'Done' : 'Pending',
        item.subitem,
        item.label,
        item.date,
        item.time,
        item.gap,
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPos,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }, // Modern blue
    });

    const exportName = workflowName ? `${workflowName.replace(/\s+/g, '_')}_Checklist.pdf` : 'CRM_Checklist.pdf';
    doc.save(exportName);
    setExportModalOpen(false);
  };

  const handleExportBackup = async () => {
    try {
      const result = await exportDatabaseBackup();
      if (!result.success || !result.data) {
        alert("Failed to export backup.");
        return;
      }
      
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CRM_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error exporting backup.");
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Are you sure? This will wipe your current database and replace it with the backup!")) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      if (!backupData.batches || !backupData.items) {
        throw new Error("Invalid backup file format.");
      }

      const result = await importDatabaseBackup(backupData);
      if (result.success) {
        alert("Backup restored successfully!");
        router.push('/');
        router.refresh();
      } else {
        alert("Failed to restore backup: " + (result.error || "Unknown error"));
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert("Failed to read the backup file: " + error.message);
    }
    e.target.value = '';
  };

  const completedCount = initialItems.filter((i) => i.done).length;
  const totalCount = initialItems.length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="panel-header">Checklist</div>
        <button 
          onClick={() => { if(confirm('Logout?')) logout(); }} 
          className="btn" 
          style={{ padding: '8px 16px', fontSize: '12px', border: 'none', background: 'rgba(225, 29, 72, 0.05)', color: '#e11d48' }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="form-group">
        <label>Batch Name</label>
        <div className="input-row">
          <input
            type="text"
            className="flex-grow"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
          />
          <button className="btn primary" onClick={handleCreateBatch}>
            Save Batch
          </button>
          <button className="btn" onClick={() => setNewBatchName('')}>
            New Batch
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Load Saved Batch</label>
        <div className="input-row">
          <select className="flex-grow" value={selectedBatchId || ''} onChange={handleBatchSelect}>
            <option value="" disabled>Select a batch</option>
            {initialBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button className="btn" onClick={handleDeleteBatch}>
            Delete Batch
          </button>
        </div>
      </div>

      <div className="progress-container">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
        </div>
        <div className="progress-stats">
          <span>{completedCount} of {totalCount} completed</span>
          <span>{percent}%</span>
        </div>
      </div>

      <div className="toolbar">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => setExportModalOpen(true)}>Export PDF</button>
          <button className="btn" onClick={handleCopyAll}>Copy All</button>
          <button className="btn" onClick={handleClearAll}>Clear List</button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={handleExportBackup}>Export Backup</button>
          <label className="btn" style={{ margin: 0 }}>
            Restore Backup
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportBackup} />
          </label>
        </div>
      </div>

      {/* List Container */}
      <div className="checklist-container">
        <div className="checklist-header">
          <div className="centered">Status</div>
          <div>Task</div>
          <div>Label</div>
          <div>Date</div>
          <div>Time</div>
          <div>Gap</div>
          <div className="centered">Action</div>
        </div>

        {initialItems.length === 0 ? (
          <div className="empty-state">No items in this batch. Ad one below.</div>
        ) : (
          initialItems.map((item) => {
            let labelClass = 'text';
            const lw = item.label.toLowerCase();
            if (lw.includes('call')) labelClass = 'call';
            if (lw.includes('email')) labelClass = 'email';
            if (lw.includes('warm') || lw.includes('warm up')) labelClass = 'warmup';
            if (lw.includes('dynamic')) labelClass = 'dynamic';
            if (lw.includes('special')) labelClass = 'special';
            if (lw.includes('event')) labelClass = 'eventday';

            return (
              <div key={item.id} className={`checklist-row ${item.done ? 'is-done' : ''}`}>
                <div className="centered">
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={item.done}
                    onChange={() => handleToggle(item.id, 'done', item.done)}
                  />
                </div>
                <div className="subitem-text">{item.subitem}</div>
                <div>
                  <span className={`pill ${labelClass}`}>{item.label}</span>
                </div>
                <div>{item.date}</div>
                <div>{item.time}</div>
                <div className="gap-text">{item.gap}</div>
                <div className="centered">
                  <button className="btn-delete" onClick={() => handleDeleteItem(item.id)}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Add Row Form Container */}
        <form className="add-row" onSubmit={handleAddItem}>
          <div className="centered-icon">+</div>
          <div>
            <input
              type="text"
              placeholder="Activity name (e.g., SMS Blast)"
              value={subitem}
              onChange={(e) => setSubitem(e.target.value)}
              required
              className="flex-grow"
            />
          </div>
          <div>
            <select value={label} onChange={(e) => setLabel(e.target.value)}>
              <option value="Text Reminder">Text Reminder</option>
              <option value="Call Reminder">Call Reminder</option>
              <option value="Email Reminder">Email Reminder</option>
              <option value="Warm Up">Warm Up</option>
              <option value="Dynamic Call">Dynamic Call</option>
              <option value="Special Text">Special Text</option>
              <option value="Event Day">Event Day</option>
            </select>
          </div>
          <div>
            <input 
              type="date" 
              value={dateStr} 
              onChange={(e) => setDateStr(e.target.value)} 
              required 
            />
          </div>
          <div>
            <input 
              type="time" 
              value={timeStr} 
              onChange={(e) => setTimeStr(e.target.value)} 
              required 
            />
          </div>
          <div className="centered">-</div>
          <div className="centered">
            <button type="submit" className="btn primary icon" style={{ borderRadius: '12px', width: '42px', height: '42px' }}>
              <Plus size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', 
          justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '700px', backgroundColor: 'var(--panel-bg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="panel-header" style={{ margin: 0 }}>Review or Paste Text</div>
              <button className="btn-delete" onClick={() => setImportModalOpen(false)} style={{ border: 'none', background: 'transparent' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Check the extracted text below. Ensure each line has the task name, date, and time. 
              You can manually edit this text or directly paste a list of tasks here before processing!
            </p>
            <textarea 
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              style={{
                width: '100%', height: '300px', backgroundColor: '#1a1b1e', 
                color: '#fff', border: '1px solid #2d2e32', borderRadius: '12px',
                padding: '16px', fontFamily: 'monospace', fontSize: '13px',
                resize: 'none', outline: 'none', marginBottom: '16px',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
              }}
              placeholder="Paste your checklist text here...&#10;Example: Rem1 Call JKN 0426CT May 1, 2026 5:00 PM"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn" onClick={() => setImportModalOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={processImportText}>Parse & Upload to Checklist</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', 
          justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '500px', backgroundColor: '#2a2a2a', padding: '24px', border: '1px solid #444', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div className="panel-header" style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '20px' }}>Export Details</div>
              <button className="btn-delete" onClick={() => setExportModalOpen(false)} style={{ border: 'none', background: 'transparent', color: '#ccc' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Workflow Name</label>
                <input type="text" value={workflowName} onChange={e => setWorkflowName(e.target.value)} placeholder="e.g., PMA-0426CT Campaign" style={{ backgroundColor: '#111', color: '#fff', border: '1px solid #333' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Assigned To</label>
                <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="e.g., John Smith" style={{ backgroundColor: '#111', color: '#fff', border: '1px solid #333' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Organization</label>
                <input type="text" value={organization} onChange={e => setOrganization(e.target.value)} placeholder="e.g., ABC Company" style={{ backgroundColor: '#111', color: '#fff', border: '1px solid #333' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Casino Name</label>
                <input type="text" value={casinoName} onChange={e => setCasinoName(e.target.value)} placeholder="e.g., Grand Casino" style={{ backgroundColor: '#111', color: '#fff', border: '1px solid #333' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Campaign Dates</label>
                <input type="text" value={campaignDates} onChange={e => setCampaignDates(e.target.value)} placeholder="e.g., March 28 - April 30, 2026" style={{ backgroundColor: '#111', color: '#fff', border: '1px solid #333' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn" style={{ borderColor: '#444', color: '#ccc', backgroundColor: '#333' }} onClick={() => setExportModalOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={handleGeneratePDF}>Generate PDF</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
