const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '◈' },
  { key: 'sales', label: 'Sales Leads', icon: '◎' },
  { key: 'rentals', label: 'Rental Leads', icon: '◉' },
  { key: 'contacts', label: 'Contacts', icon: '◍' },
  { key: 'inventory', label: 'Projects & Properties', icon: '◬' },
  { key: 'tasks', label: 'Follow-ups', icon: '◔' },
  { key: 'viewings', label: 'Viewings', icon: '◌' },
  { key: 'settings', label: 'Settings & Imports', icon: '◐' }
];

const SALES_STAGES = ['New', 'Contacted', 'Qualified', 'Viewing Scheduled', 'Proposal Sent', 'Negotiating', 'Closed Won', 'Closed Lost'];
const RENTAL_STAGES = ['New', 'Contacted', 'Requirement Matched', 'Viewing Scheduled', 'Application Sent', 'Negotiating', 'Contract Signed', 'Closed Lost'];
const VIEWING_STATUS = ['Scheduled', 'Confirmed', 'Completed', 'Rescheduled', 'Cancelled'];

const store = {
  user: { id: 'u-admin', name: 'Nadia Admin', role: 'admin' },
  leadSources: ['Google Form', 'Website', 'Referral', 'Meta Ads', 'Walk-in'],
  tags: ['Hot', 'Investor', 'Urgent', 'Luxury', 'Family'],
  salesLeads: [],
  rentalLeads: [],
  contacts: [],
  inventory: [],
  tasks: [],
  viewings: [],
  activities: [],
  importLogs: []
};

const state = {
  page: 'dashboard',
  query: '',
  leadView: 'list',
  selectedLeadId: null,
  selectedLeadType: 'sales',
  loading: false
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function uid(prefix) { return `${prefix}_${Math.random().toString(36).slice(2, 9)}`; }
function nowDate() { return new Date().toISOString().slice(0, 10); }

function persist() { localStorage.setItem('nbcrm-v2', JSON.stringify(store)); }
function hydrate() {
  const raw = localStorage.getItem('nbcrm-v2');
  if (!raw) return;
  Object.assign(store, JSON.parse(raw));
}

function trackActivity(message, entityType = 'system', entityId = '') {
  store.activities.unshift({ id: uid('a'), message, entityType, entityId, date: new Date().toISOString() });
  store.activities = store.activities.slice(0, 60);
}

function sourceColor(source) {
  const map = {
    'Google Form': 'info', Website: 'success', Referral: 'accent', 'Meta Ads': 'warning', 'Walk-in': 'neutral'
  };
  return map[source] || 'neutral';
}

function stageTone(stage) {
  if (/won|signed|completed/i.test(stage)) return 'success';
  if (/lost|cancel/i.test(stage)) return 'danger';
  if (/new/i.test(stage)) return 'info';
  return 'warning';
}

function duplicateLead(email, phone) {
  const all = [...store.salesLeads, ...store.rentalLeads];
  return all.find(l => (email && l.email === email) || (phone && l.phone === phone));
}

function updateTopbar() {
  const map = {
    dashboard: ['Command Center', 'Premium real estate intelligence at a glance.'],
    sales: ['Project Sales Pipeline', 'Capture, qualify, and close project buyers with confidence.'],
    rentals: ['Rental Demand Pipeline', 'Convert rental inquiries into signed contracts faster.'],
    contacts: ['Relationship Hub', 'Every buyer, tenant, landlord, and investor in one place.'],
    inventory: ['Projects & Properties', 'Maintain your active inventory and match leads quickly.'],
    tasks: ['Follow-up Engine', 'Never miss a call, brochure send, or negotiation step again.'],
    viewings: ['Appointments & Viewings', 'Coordinate tours with clean visibility across your team.'],
    settings: ['Settings, Sources & Imports', 'Control pipeline inputs and integration workflows.']
  };
  $('#pageTitle').textContent = map[state.page][0];
  $('#pageSubtitle').textContent = map[state.page][1];
}

function renderNav() {
  $('#nav').innerHTML = NAV_ITEMS.map(item => `
    <button class="nav-link ${state.page === item.key ? 'active' : ''}" data-page="${item.key}">
      <span>${item.icon}</span><span>${item.label}</span>
    </button>
  `).join('');
  $$('#nav [data-page]').forEach(btn => btn.onclick = () => navigate(btn.dataset.page));
}

function navigate(page) {
  state.page = page;
  state.loading = true;
  render();
  setTimeout(() => {
    state.loading = false;
    render();
  }, 140);
}

function renderQuickActions() {
  const actions = [
    ['Add Sales Lead', () => openLeadDrawer('sales')],
    ['Add Rental Lead', () => openLeadDrawer('rentals')],
    ['New Contact', openContactDrawer],
    ['New Task', openTaskDrawer],
    ['Book Viewing', openViewingDrawer]
  ];
  $('#quickActions').innerHTML = actions.map(([label], i) => `<button class="${i===0?'primary':'secondary'}" data-q="${i}">${label}</button>`).join('');
  $$('#quickActions [data-q]').forEach(btn => btn.onclick = () => actions[Number(btn.dataset.q)][1]());
}

function renderLoading() {
  $('#content').innerHTML = `<div class="grid cols-3">${Array.from({ length: 6 }).map(() => '<div class="skeleton card"></div>').join('')}</div>`;
}

function metricCard(label, value, delta, tone = 'info') {
  return `<article class="card metric ${tone}"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-delta">${delta}</div></article>`;
}

function countByStage(items, stages) {
  return stages.map(stage => ({ stage, count: items.filter(x => x.stage === stage).length }));
}

function renderStageBars(title, rows) {
  const max = Math.max(...rows.map(r => r.count), 1);
  return `<article class="card"><h3>${title}</h3><div class="bars">${rows.map(r => `
    <div class="bar-row">
      <span>${r.stage}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(r.count / max) * 100}%"></div></div>
      <b>${r.count}</b>
    </div>
  `).join('')}</div></article>`;
}

function renderDashboard() {
  const allLeads = [...store.salesLeads, ...store.rentalLeads];
  const today = new Date().toDateString();
  const newToday = allLeads.filter(l => new Date(l.createdAt).toDateString() === today).length;
  const newWeek = allLeads.filter(l => Date.now() - new Date(l.createdAt).getTime() < 7 * 86400000).length;
  const dueToday = store.tasks.filter(t => t.dueDate === nowDate() && t.status !== 'Done').length;
  const overdue = store.tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'Done').length;
  const hotLeads = allLeads.filter(l => l.priority === 'High' && !/won|lost|signed/i.test(l.stage)).length;

  const sourceCount = {};
  allLeads.forEach(l => sourceCount[l.source] = (sourceCount[l.source] || 0) + 1);

  $('#content').innerHTML = `
    <div class="grid cols-5">
      ${metricCard('New Leads Today', newToday, '+ Daily intake', 'info')}
      ${metricCard('New Leads This Week', newWeek, '+ Weekly velocity', 'success')}
      ${metricCard('Follow-ups Due', dueToday, 'Today', 'warning')}
      ${metricCard('Overdue Follow-ups', overdue, overdue ? 'Needs action' : 'On track', overdue ? 'danger' : 'success')}
      ${metricCard('Hot Leads', hotLeads, 'High priority', 'accent')}
    </div>

    <div class="grid cols-2 mt">
      ${renderStageBars('Sales Pipeline', countByStage(store.salesLeads, SALES_STAGES))}
      ${renderStageBars('Rental Pipeline', countByStage(store.rentalLeads, RENTAL_STAGES))}
    </div>

    <div class="grid cols-3 mt">
      <article class="card">
        <h3>Lead Source Mix</h3>
        <ul class="list">${Object.entries(sourceCount).map(([source, count]) => `<li><span class="badge ${sourceColor(source)}">${source}</span><b>${count}</b></li>`).join('') || '<li class="empty-inline">No source data yet</li>'}</ul>
      </article>
      <article class="card">
        <h3>Upcoming Viewings</h3>
        <ul class="list">${store.viewings.slice(0, 5).map(v => `<li><div>${v.datetime}</div><small>${v.contactName} • ${v.propertyName}</small></li>`).join('') || '<li class="empty-inline">No viewings scheduled</li>'}</ul>
      </article>
      <article class="card">
        <h3>Recent Activity</h3>
        <ul class="list">${store.activities.slice(0, 6).map(a => `<li><div>${a.message}</div><small>${new Date(a.date).toLocaleString()}</small></li>`).join('') || '<li class="empty-inline">No activity yet</li>'}</ul>
      </article>
    </div>
  `;
}

function renderLeadPage(type) {
  const leads = type === 'sales' ? store.salesLeads : store.rentalLeads;
  const filtered = leads.filter(l => [l.fullName, l.phone, l.email, l.assignedAgent, l.source, (l.tags || []).join(' ')].join(' ').toLowerCase().includes(state.query.toLowerCase()));
  const stages = type === 'sales' ? SALES_STAGES : RENTAL_STAGES;

  const listView = `
    <div class="table-wrap card">
      <table>
        <thead><tr><th>Name</th><th>Stage</th><th>Priority</th><th>Agent</th><th>Next Follow-up</th><th>Source</th><th></th></tr></thead>
        <tbody>
          ${filtered.map(lead => `
            <tr>
              <td><strong>${lead.fullName}</strong><small>${lead.phone || '-'} • ${lead.email || '-'}</small></td>
              <td><span class="badge ${stageTone(lead.stage)}">${lead.stage}</span></td>
              <td><span class="chip ${lead.priority === 'High' ? 'danger' : lead.priority === 'Medium' ? 'warning' : 'neutral'}">${lead.priority || 'Low'}</span></td>
              <td>${lead.assignedAgent || '-'}</td>
              <td>${lead.nextFollowUp || '-'}</td>
              <td><span class="badge ${sourceColor(lead.source)}">${lead.source || '-'}</span></td>
              <td class="actions-row">
                <button class="icon-btn" data-open="${lead.id}">Open</button>
                <button class="icon-btn" data-edit="${lead.id}">Edit</button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="7"><div class="empty-inline">No leads yet. Create one with Quick Actions.</div></td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  const kanban = `
    <div class="kanban">${stages.map(stage => `
      <section class="kanban-col">
        <header>${stage} <span>${filtered.filter(f => f.stage === stage).length}</span></header>
        <div class="kanban-list">
          ${filtered.filter(f => f.stage === stage).map(lead => `
            <article class="kanban-card" data-open="${lead.id}">
              <strong>${lead.fullName}</strong>
              <small>${lead.budget || 'Budget n/a'}</small>
              <div class="kanban-meta"><span>${lead.assignedAgent || 'Unassigned'}</span><span>${lead.nextFollowUp || '-'}</span></div>
            </article>
          `).join('') || '<p class="empty-inline">No leads</p>'}
        </div>
      </section>
    `).join('')}</div>
  `;

  $('#content').innerHTML = `
    <div class="sticky-toolbar card">
      <input class="search" placeholder="Search by name, phone, source, tags" id="leadSearch" value="${state.query}" />
      <div class="segmented">
        <button class="${state.leadView === 'list' ? 'active' : ''}" data-v="list">List</button>
        <button class="${state.leadView === 'kanban' ? 'active' : ''}" data-v="kanban">Kanban</button>
      </div>
      <button class="primary" id="createLeadBtn">New ${type === 'sales' ? 'Sales' : 'Rental'} Lead</button>
    </div>
    <div class="mt">${state.leadView === 'list' ? listView : kanban}</div>
  `;

  $('#leadSearch').oninput = e => { state.query = e.target.value; renderLeadPage(type); };
  $$('.segmented [data-v]').forEach(btn => btn.onclick = () => { state.leadView = btn.dataset.v; renderLeadPage(type); });
  $('#createLeadBtn').onclick = () => openLeadDrawer(type);
  $$('[data-open]').forEach(btn => btn.onclick = () => openLeadDetail(type, btn.dataset.open));
  $$('[data-edit]').forEach(btn => btn.onclick = () => openLeadDrawer(type, leads.find(x => x.id === btn.dataset.edit)));
}

function openDrawer(content, onSubmit) {
  const drawer = $('#drawer');
  const form = $('#drawerForm');
  form.innerHTML = content;
  drawer.showModal();
  form.onsubmit = e => {
    e.preventDefault();
    onSubmit(new FormData(form));
  };
}

function leadFields(type, lead = {}) {
  return `
    <h3>${lead.id ? 'Edit' : 'Create'} ${type === 'sales' ? 'Sales' : 'Rental'} Lead</h3>
    <div class="form-grid">
      <label>Full Name<input name="fullName" value="${lead.fullName || ''}" required /></label>
      <label>Phone<input name="phone" value="${lead.phone || ''}" /></label>
      <label>Email<input name="email" value="${lead.email || ''}" /></label>
      <label>Nationality<input name="nationality" value="${lead.nationality || ''}" /></label>
      <label>${type === 'sales' ? 'Preferred Project' : 'Preferred Area'}<input name="preferred" value="${lead.preferred || ''}" /></label>
      <label>Budget<input name="budget" value="${lead.budget || ''}" /></label>
      <label>${type === 'sales' ? 'Unit Type' : 'Property Type'}<input name="unitType" value="${lead.unitType || ''}" /></label>
      <label>Bedrooms<input name="bedrooms" value="${lead.bedrooms || ''}" /></label>
      <label>Lead Source<select name="source">${store.leadSources.map(x => `<option ${lead.source===x?'selected':''}>${x}</option>`)}</select></label>
      <label>Assigned Agent<input name="assignedAgent" value="${lead.assignedAgent || ''}" /></label>
      <label>Stage<select name="stage">${(type === 'sales' ? SALES_STAGES : RENTAL_STAGES).map(x => `<option ${lead.stage===x?'selected':''}>${x}</option>`)}</select></label>
      <label>Priority<select name="priority">${['Low','Medium','High'].map(x => `<option ${lead.priority===x?'selected':''}>${x}</option>`)}</select></label>
      <label>Next Follow-up<input type="date" name="nextFollowUp" value="${lead.nextFollowUp || nowDate()}" /></label>
      <label>Tags (comma separated)<input name="tags" value="${(lead.tags || []).join(', ')}" /></label>
      <label class="full">Notes<textarea name="notes">${lead.notes || ''}</textarea></label>
    </div>
    <menu><button class="secondary" value="cancel">Cancel</button><button class="primary">Save Lead</button></menu>
  `;
}

function openLeadDrawer(type, lead) {
  openDrawer(leadFields(type, lead), formData => {
    const payload = Object.fromEntries(formData.entries());
    payload.tags = payload.tags ? payload.tags.split(',').map(x => x.trim()).filter(Boolean) : [];
    const collection = type === 'sales' ? store.salesLeads : store.rentalLeads;

    if (!lead && duplicateLead(payload.email, payload.phone)) return alert('Duplicate detected by phone/email.');

    if (lead) Object.assign(lead, payload);
    else collection.unshift({ id: uid('lead'), type, createdAt: new Date().toISOString(), ...payload });

    trackActivity(`${payload.fullName} ${lead ? 'updated' : 'created'} in ${type} pipeline.`, 'lead', lead?.id || collection[0].id);
    persist();
    $('#drawer').close();
    render();
  });
}

function openLeadDetail(type, leadId) {
  const collection = type === 'sales' ? store.salesLeads : store.rentalLeads;
  const lead = collection.find(l => l.id === leadId);
  if (!lead) return;

  const tasks = store.tasks.filter(t => t.relatedId === leadId);
  const activities = store.activities.filter(a => a.entityId === leadId).slice(0, 8);
  const matches = store.inventory.filter(p => (lead.preferred || '').toLowerCase().includes((p.location || '').toLowerCase()) || (lead.unitType || '').toLowerCase().includes((p.type || '').toLowerCase())).slice(0, 4);

  openDrawer(`
    <h3>${lead.fullName}</h3>
    <p class="drawer-sub">${lead.phone || '-'} • ${lead.email || '-'} • ${lead.assignedAgent || 'Unassigned'}</p>
    <div class="grid cols-2">
      <article class="mini-panel"><h4>Overview</h4><p>Stage: <span class="badge ${stageTone(lead.stage)}">${lead.stage}</span></p><p>Priority: ${lead.priority}</p><p>Budget: ${lead.budget || '-'}</p><p>Next follow-up: ${lead.nextFollowUp || '-'}</p></article>
      <article class="mini-panel"><h4>Suggested Matches</h4>${matches.map(m => `<p>${m.name} <small>${m.location || '-'} • ${m.price || '-'}</small></p>`).join('') || '<p class="empty-inline">No matched properties yet.</p>'}</article>
    </div>
    <article class="mini-panel"><h4>Tasks</h4>${tasks.map(t => `<p>${t.title} <small>${t.dueDate} • ${t.status}</small></p>`).join('') || '<p class="empty-inline">No tasks linked.</p>'}</article>
    <article class="mini-panel"><h4>Activity Timeline</h4>${activities.map(a => `<p>${a.message}<small>${new Date(a.date).toLocaleString()}</small></p>`).join('') || '<p class="empty-inline">No timeline entries.</p>'}</article>
    <menu><button class="secondary" value="cancel">Close</button></menu>
  `, () => {});
}

function openContactDrawer(contact) {
  openDrawer(`
    <h3>${contact ? 'Edit' : 'Create'} Contact</h3>
    <div class="form-grid">
      <label>Full Name<input name="fullName" value="${contact?.fullName || ''}" required /></label>
      <label>Phone<input name="phone" value="${contact?.phone || ''}" /></label>
      <label>Email<input name="email" value="${contact?.email || ''}" /></label>
      <label>Contact Type<select name="type">${['Buyer','Tenant','Landlord','Seller','Investor','Partner'].map(x => `<option ${contact?.type===x?'selected':''}>${x}</option>`)}</select></label>
      <label>Line / WhatsApp<input name="messaging" value="${contact?.messaging || ''}" /></label>
      <label>Nationality<input name="nationality" value="${contact?.nationality || ''}" /></label>
      <label>Preferred Areas<input name="areas" value="${contact?.areas || ''}" /></label>
      <label>Budget Range<input name="budget" value="${contact?.budget || ''}" /></label>
      <label>Tags<input name="tags" value="${(contact?.tags || []).join(', ')}" /></label>
      <label class="full">Notes<textarea name="notes">${contact?.notes || ''}</textarea></label>
    </div>
    <menu><button class="secondary" value="cancel">Cancel</button><button class="primary">Save Contact</button></menu>
  `, formData => {
    const payload = Object.fromEntries(formData.entries());
    payload.tags = payload.tags ? payload.tags.split(',').map(x => x.trim()).filter(Boolean) : [];

    if (!contact && store.contacts.some(c => (payload.email && c.email === payload.email) || (payload.phone && c.phone === payload.phone))) {
      return alert('Duplicate contact detected by phone/email.');
    }

    if (contact) Object.assign(contact, payload);
    else store.contacts.unshift({ id: uid('contact'), lastContactDate: nowDate(), ...payload });

    trackActivity(`Contact ${payload.fullName} ${contact ? 'updated' : 'created'}.`, 'contact', contact?.id || store.contacts[0].id);
    persist(); $('#drawer').close(); render();
  });
}

function openInventoryDrawer(item) {
  openDrawer(`
    <h3>${item ? 'Edit' : 'Create'} Project / Property</h3>
    <div class="form-grid">
      <label>Name<input name="name" value="${item?.name || ''}" required /></label>
      <label>Category<select name="category"><option ${item?.category==='project'?'selected':''} value="project">Project Sales</option><option ${item?.category==='rental'?'selected':''} value="rental">Rental</option></select></label>
      <label>Developer / Building<input name="developer" value="${item?.developer || ''}" /></label>
      <label>Location / Area<input name="location" value="${item?.location || ''}" /></label>
      <label>Type<input name="type" value="${item?.type || ''}" /></label>
      <label>Price / Rent<input name="price" value="${item?.price || ''}" /></label>
      <label>Bedrooms<input name="bedrooms" value="${item?.bedrooms || ''}" /></label>
      <label>Bathrooms<input name="bathrooms" value="${item?.bathrooms || ''}" /></label>
      <label>Furnished<input name="furnished" value="${item?.furnished || ''}" /></label>
      <label>Availability<input name="availability" value="${item?.availability || 'Available'}" /></label>
      <label class="full">Notes<textarea name="notes">${item?.notes || ''}</textarea></label>
    </div>
    <menu><button class="secondary" value="cancel">Cancel</button><button class="primary">Save</button></menu>
  `, formData => {
    const payload = Object.fromEntries(formData.entries());
    if (item) Object.assign(item, payload);
    else store.inventory.unshift({ id: uid('inv'), ...payload });
    trackActivity(`${payload.name} ${item ? 'updated' : 'added'} to inventory.`, 'inventory', item?.id || store.inventory[0].id);
    persist(); $('#drawer').close(); render();
  });
}

function openTaskDrawer(task) {
  openDrawer(`
    <h3>${task ? 'Edit' : 'Create'} Follow-up Task</h3>
    <div class="form-grid">
      <label>Title<input name="title" value="${task?.title || ''}" required /></label>
      <label>Assigned User<input name="assignedUser" value="${task?.assignedUser || store.user.name}" /></label>
      <label>Related Type<select name="relatedType">${['lead','contact','inventory'].map(x => `<option ${task?.relatedType===x?'selected':''}>${x}</option>`)}</select></label>
      <label>Related ID<input name="relatedId" value="${task?.relatedId || ''}" /></label>
      <label>Due Date<input type="date" name="dueDate" value="${task?.dueDate || nowDate()}" /></label>
      <label>Status<select name="status">${['Open','In Progress','Done'].map(x => `<option ${task?.status===x?'selected':''}>${x}</option>`)}</select></label>
      <label>Priority<select name="priority">${['Low','Medium','High'].map(x => `<option ${task?.priority===x?'selected':''}>${x}</option>`)}</select></label>
      <label class="full">Notes<textarea name="notes">${task?.notes || ''}</textarea></label>
    </div>
    <menu><button class="secondary" value="cancel">Cancel</button><button class="primary">Save Task</button></menu>
  `, formData => {
    const payload = Object.fromEntries(formData.entries());
    if (task) Object.assign(task, payload);
    else store.tasks.unshift({ id: uid('task'), ...payload });
    trackActivity(`Task ${payload.title} ${task ? 'updated' : 'created'}.`, 'task', task?.id || store.tasks[0].id);
    persist(); $('#drawer').close(); render();
  });
}

function openViewingDrawer(viewing) {
  openDrawer(`
    <h3>${viewing ? 'Edit' : 'Book'} Viewing</h3>
    <div class="form-grid">
      <label>Date & Time<input name="datetime" placeholder="2026-03-15 14:00" value="${viewing?.datetime || ''}" required /></label>
      <label>Assigned Agent<input name="agent" value="${viewing?.agent || store.user.name}" /></label>
      <label>Contact<input name="contactName" value="${viewing?.contactName || ''}" /></label>
      <label>Related Property<input name="propertyName" value="${viewing?.propertyName || ''}" /></label>
      <label>Status<select name="status">${VIEWING_STATUS.map(x => `<option ${viewing?.status===x?'selected':''}>${x}</option>`)}</select></label>
      <label>Outcome<input name="outcome" value="${viewing?.outcome || ''}" /></label>
      <label class="full">Notes<textarea name="notes">${viewing?.notes || ''}</textarea></label>
    </div>
    <menu><button class="secondary" value="cancel">Cancel</button><button class="primary">Save Viewing</button></menu>
  `, formData => {
    const payload = Object.fromEntries(formData.entries());
    if (viewing) Object.assign(viewing, payload);
    else store.viewings.unshift({ id: uid('viewing'), ...payload });
    trackActivity(`Viewing for ${payload.contactName || 'client'} ${viewing ? 'updated' : 'booked'}.`, 'viewing', viewing?.id || store.viewings[0].id);
    persist(); $('#drawer').close(); render();
  });
}

function renderSimpleTable(title, addLabel, rowsHtml, onAdd) {
  $('#content').innerHTML = `
    <div class="sticky-toolbar card"><h3>${title}</h3><button class="primary" id="addBtn">${addLabel}</button></div>
    <div class="table-wrap card mt">${rowsHtml}</div>
  `;
  $('#addBtn').onclick = onAdd;
}

function renderContacts() {
  const rows = `
    <table>
      <thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Area</th><th>Last Contact</th><th></th></tr></thead>
      <tbody>${store.contacts.map(c => `
        <tr>
          <td><strong>${c.fullName}</strong><small>${c.email || '-'}</small></td>
          <td><span class="badge neutral">${c.type}</span></td>
          <td>${c.phone || '-'}</td>
          <td>${c.areas || '-'}</td>
          <td>${c.lastContactDate || '-'}</td>
          <td><button class="icon-btn" data-edit="${c.id}">Edit</button></td>
        </tr>
      `).join('') || '<tr><td colspan="6"><div class="empty-inline">No contacts yet.</div></td></tr>'}</tbody>
    </table>
  `;
  renderSimpleTable('Contacts', 'Add Contact', rows, () => openContactDrawer());
  $$('[data-edit]').forEach(btn => btn.onclick = () => openContactDrawer(store.contacts.find(x => x.id === btn.dataset.edit)));
}

function renderInventory() {
  const rows = `
    <table>
      <thead><tr><th>Name</th><th>Category</th><th>Location</th><th>Price</th><th>Availability</th><th></th></tr></thead>
      <tbody>${store.inventory.map(i => `
        <tr>
          <td><strong>${i.name}</strong><small>${i.developer || '-'}</small></td>
          <td><span class="badge ${i.category === 'project' ? 'info' : 'success'}">${i.category}</span></td>
          <td>${i.location || '-'}</td>
          <td>${i.price || '-'}</td>
          <td>${i.availability || '-'}</td>
          <td><button class="icon-btn" data-edit="${i.id}">Edit</button></td>
        </tr>
      `).join('') || '<tr><td colspan="6"><div class="empty-inline">No inventory yet.</div></td></tr>'}</tbody>
    </table>
  `;
  renderSimpleTable('Projects & Properties', 'Add Property/Project', rows, () => openInventoryDrawer());
  $$('[data-edit]').forEach(btn => btn.onclick = () => openInventoryDrawer(store.inventory.find(x => x.id === btn.dataset.edit)));
}

function renderTasks() {
  const rows = `
    <table>
      <thead><tr><th>Task</th><th>Due</th><th>Status</th><th>Priority</th><th>Assigned</th><th></th></tr></thead>
      <tbody>${store.tasks.map(t => `
        <tr>
          <td>${t.title}<small>${t.relatedType || '-'}:${t.relatedId || '-'}</small></td>
          <td>${t.dueDate || '-'}</td>
          <td><span class="badge ${stageTone(t.status)}">${t.status}</span></td>
          <td><span class="chip ${t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'neutral'}">${t.priority || 'Low'}</span></td>
          <td>${t.assignedUser || '-'}</td>
          <td><button class="icon-btn" data-edit="${t.id}">Edit</button></td>
        </tr>
      `).join('') || '<tr><td colspan="6"><div class="empty-inline">No tasks yet.</div></td></tr>'}</tbody>
    </table>
  `;
  renderSimpleTable('Follow-up Tasks', 'Create Task', rows, () => openTaskDrawer());
  $$('[data-edit]').forEach(btn => btn.onclick = () => openTaskDrawer(store.tasks.find(x => x.id === btn.dataset.edit)));
}

function renderViewings() {
  const rows = `
    <table>
      <thead><tr><th>Date/Time</th><th>Contact</th><th>Property</th><th>Agent</th><th>Status</th><th></th></tr></thead>
      <tbody>${store.viewings.map(v => `
        <tr>
          <td>${v.datetime}</td><td>${v.contactName || '-'}</td><td>${v.propertyName || '-'}</td><td>${v.agent || '-'}</td>
          <td><span class="badge ${stageTone(v.status)}">${v.status}</span></td>
          <td><button class="icon-btn" data-edit="${v.id}">Edit</button></td>
        </tr>
      `).join('') || '<tr><td colspan="6"><div class="empty-inline">No viewings scheduled.</div></td></tr>'}</tbody>
    </table>
  `;
  renderSimpleTable('Appointments / Viewings', 'Book Viewing', rows, () => openViewingDrawer());
  $$('[data-edit]').forEach(btn => btn.onclick = () => openViewingDrawer(store.viewings.find(x => x.id === btn.dataset.edit)));
}

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const headers = header.split(',').map(x => x.trim());
  return lines.filter(Boolean).map(line => {
    const cols = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, (cols[i] || '').trim()]));
  });
}

function importRows(rows, mapping, type) {
  const collection = type === 'sales' ? store.salesLeads : store.rentalLeads;
  let imported = 0;
  rows.forEach(r => {
    const data = {
      fullName: r[mapping.fullName] || '',
      phone: r[mapping.phone] || '',
      email: r[mapping.email] || '',
      source: r[mapping.source] || 'Google Form',
      assignedAgent: r[mapping.assignedAgent] || '',
      budget: r[mapping.budget] || '',
      stage: 'New',
      priority: 'Medium',
      nextFollowUp: nowDate(),
      importedAt: new Date().toISOString(),
      sourceRef: mapping.sourceRef ? r[mapping.sourceRef] : ''
    };
    if (duplicateLead(data.email, data.phone)) return;
    collection.unshift({ id: uid('lead'), type, createdAt: new Date().toISOString(), ...data });
    imported += 1;
  });

  store.importLogs.unshift({ id: uid('import'), timestamp: new Date().toISOString(), type, imported, total: rows.length });
  trackActivity(`${imported}/${rows.length} ${type} leads imported from Google Sheets CSV.`, 'import', store.importLogs[0].id);
  persist();
  return imported;
}

function renderSettings() {
  $('#content').innerHTML = `
    <div class="grid cols-2">
      <article class="card">
        <h3>Google Sheets Import Center</h3>
        <p class="helper">Paste CSV exported from Google Sheets form responses. Map your columns and import into Sales or Rental pipeline.</p>
        <label>CSV Data<textarea id="csvData" rows="8" placeholder="Full Name,Phone,Email,Lead Source,Agent,Budget"></textarea></label>
        <div class="form-grid">
          <label>Lead Type<select id="mapType"><option value="sales">Sales</option><option value="rentals">Rentals</option></select></label>
          <label>Full Name column<input id="mName" value="Full Name" /></label>
          <label>Phone column<input id="mPhone" value="Phone" /></label>
          <label>Email column<input id="mEmail" value="Email" /></label>
          <label>Source column<input id="mSource" value="Lead Source" /></label>
          <label>Assigned Agent column<input id="mAgent" value="Agent" /></label>
          <label>Budget column<input id="mBudget" value="Budget" /></label>
          <label>Source Ref column<input id="mRef" placeholder="Timestamp or Response ID" /></label>
        </div>
        <button class="primary" id="runImport">Run Import</button>
        <p id="importResult" class="helper"></p>
      </article>
      <article class="card">
        <h3>Admin Settings (MVP)</h3>
        <ul class="list">
          <li>Roles: <span class="badge neutral">admin</span> <span class="badge neutral">agent</span></li>
          <li>Lead sources: ${store.leadSources.map(s => `<span class="chip neutral">${s}</span>`).join(' ')}</li>
          <li>Tag management: ${store.tags.map(t => `<span class="chip accent">${t}</span>`).join(' ')}</li>
          <li>Pipeline stages: configurable in next backend phase</li>
          <li>Integration placeholders: Google Sheets API, Website forms, Meta lead forms</li>
        </ul>
        <h4>Import Logs</h4>
        <ul class="list">${store.importLogs.slice(0, 6).map(l => `<li>${new Date(l.timestamp).toLocaleString()}<small>${l.type} • imported ${l.imported}/${l.total}</small></li>`).join('') || '<li class="empty-inline">No imports yet.</li>'}</ul>
      </article>
    </div>
  `;

  $('#runImport').onclick = () => {
    const csv = $('#csvData').value.trim();
    if (!csv) return;
    const rows = parseCsv(csv);
    const imported = importRows(rows, {
      fullName: $('#mName').value,
      phone: $('#mPhone').value,
      email: $('#mEmail').value,
      source: $('#mSource').value,
      assignedAgent: $('#mAgent').value,
      budget: $('#mBudget').value,
      sourceRef: $('#mRef').value
    }, $('#mapType').value === 'sales' ? 'sales' : 'rentals');
    $('#importResult').textContent = `Imported ${imported} row(s). Duplicate rows were skipped.`;
    render();
  };
}

function seedData() {
  if (store.salesLeads.length || store.rentalLeads.length) return alert('Demo data already seeded.');

  store.salesLeads.push({ id: uid('lead'), type: 'sales', fullName: 'Nora Chai', phone: '0811002200', email: 'nora@example.com', nationality: 'Thai', preferred: 'Sathorn', budget: '8M - 10M', unitType: '2BR', bedrooms: '2', source: 'Website', assignedAgent: 'Mark', stage: 'Qualified', priority: 'High', nextFollowUp: nowDate(), tags: ['Hot','Luxury'], notes: 'Wants river view', createdAt: new Date().toISOString() });
  store.rentalLeads.push({ id: uid('lead'), type: 'rentals', fullName: 'Liam Chen', phone: '0890022011', email: 'liam@tenantmail.com', nationality: 'Singaporean', preferred: 'Thonglor', budget: '60,000 THB', unitType: 'Condo', bedrooms: '1', source: 'Google Form', assignedAgent: 'Pim', stage: 'Requirement Matched', priority: 'Medium', nextFollowUp: nowDate(), tags: ['Investor'], notes: 'Move in next month', createdAt: new Date().toISOString() });
  store.contacts.push({ id: uid('contact'), fullName: 'Ariya Tan', phone: '0809981122', email: 'ariya@owner.co', type: 'Landlord', messaging: 'Line: ariya', nationality: 'Thai', areas: 'Ekkamai, Phrom Phong', budget: '-', tags: ['Luxury'], notes: 'Owns 3 premium units', lastContactDate: nowDate() });
  store.inventory.push({ id: uid('inv'), name: 'Skyline Riverside', category: 'project', developer: 'Urban Heights', location: 'Rama 3', type: 'High-rise', price: '6M - 20M', bedrooms: '-', bathrooms: '-', furnished: '-', availability: 'Open', notes: 'Strong river-facing inventory' });
  store.inventory.push({ id: uid('inv'), name: 'The Crest Thonglor 1BR', category: 'rental', developer: 'The Crest', location: 'Thonglor', type: 'Condo', price: '58,000 THB', bedrooms: '1', bathrooms: '1', furnished: 'Fully Furnished', availability: 'Available', notes: '' });
  store.tasks.push({ id: uid('task'), title: 'Schedule buyer viewing', assignedUser: 'Mark', relatedType: 'lead', relatedId: store.salesLeads[0].id, dueDate: nowDate(), status: 'Open', priority: 'High', notes: 'Confirm Friday 2 PM' });
  store.viewings.push({ id: uid('viewing'), datetime: `${nowDate()} 14:00`, agent: 'Mark', contactName: 'Nora Chai', propertyName: 'Skyline Riverside', status: 'Scheduled', outcome: '', notes: '' });
  trackActivity('Premium demo dataset initialized.');
  persist();
  render();
}

function renderCurrentPage() {
  if (state.page === 'dashboard') return renderDashboard();
  if (state.page === 'sales') return renderLeadPage('sales');
  if (state.page === 'rentals') return renderLeadPage('rentals');
  if (state.page === 'contacts') return renderContacts();
  if (state.page === 'inventory') return renderInventory();
  if (state.page === 'tasks') return renderTasks();
  if (state.page === 'viewings') return renderViewings();
  return renderSettings();
}

function render() {
  renderNav();
  renderQuickActions();
  updateTopbar();
  if (state.loading) return renderLoading();
  renderCurrentPage();
}

$('#seedDataBtn').addEventListener('click', seedData);
hydrate();
render();
