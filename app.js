(() => {
  const $ = id => document.getElementById(id);
  const formLogin = $('loginForm');
  const formSetup = $('setupForm');
  const message = $('message');
  const users = () => Storage.get('hcm_users', []);
  const company = () => Storage.get('hcm_company');
  const show = (text, type = 'error') => {
    if (!message) return;
    message.textContent = text;
    message.className = type;
  };
  const current = Storage.get('hcm_session');
  if (current) {
    const user = users().find(u => String(u.id) === String(current.userId) && u.role === current.role);
    if (user) {
      location.replace(user.role === 'admin' ? 'admin.html' : 'employee.html');
      return;
    }
    Storage.remove('hcm_session');
  }
  if (formSetup) {
    const role = $('accountType');
    function syncRole() {
      const isAdmin = role.value === 'admin';
      $('adminFields').hidden = !isAdmin;
      $('companyName').required = isAdmin;
      $('employeeInfo').hidden = isAdmin;
      $('nameLabel').textContent = isAdmin ? 'Admin full name' : 'Employee full name';
      $('emailLabel').textContent = isAdmin ? 'Admin email address' : 'Employee email address';
      show('', '');
    }
    role.addEventListener('change', syncRole);
    syncRole();
    formSetup.addEventListener('submit', event => {
      event.preventDefault();
      const type = role.value;
      const name = $('adminName').value.trim();
      const email = $('adminEmail').value.trim().toLowerCase();
      const password = $('adminPassword').value;
      const companyName = $('companyName').value.trim();
      if (!name || !email || password.length < 6 || (type === 'admin' && !companyName)) {
        show('Please fill out all required fields. Password must be at least 6 characters.'); return;
      }
      const existingCompany = company();
      const savedUsers = users();
      if (savedUsers.some(u => String(u.email).toLowerCase() === email)) {
        show('An account with this email already exists.'); return;
      }
      if (type === 'admin' && (existingCompany || savedUsers.length)) {
        show('A company has already been created in this browser. Please sign in with your admin account.'); return;
      }
      if (type === 'employee' && !existingCompany) {
        show('No company exists yet. Please create an Admin Account first.'); return;
      }
      const account = {
        id: Date.now() + Math.floor(Math.random() * 10000), name, email, role: type,
        department: type === 'admin' ? 'Management' : 'General',
        salary: 0, payMethod: 'cheque', bankName: '', accountNo: ''
      };
      Auth.setPassword(account, password);
      if (type === 'admin') {
        Storage.set('hcm_company', {
          name: companyName, officeStart: '09:00', graceMinutes: 15,
          leaveQuota: 20, latesPerDeduction: 0, workingDays: [1, 2, 3, 4, 5]
        });
        for (const key of ['hcm_attendance','hcm_leaves','hcm_holidays','hcm_payments']) {
          if (!Storage.get(key)) Storage.set(key, []);
        }
      }
      Storage.set('hcm_users', [...savedUsers, account]);
      formSetup.reset();
      show('Account created! You can now sign in.', 'success');
      setTimeout(() => { location.href = 'index.html'; }, 850);
    });
  }
  if (formLogin) {
    formLogin.addEventListener('submit', event => {
      event.preventDefault();
      const email = $('email').value.trim().toLowerCase();
      const password = $('password').value;
      const type = $('loginRole').value;
      const list = users();
      const account = list.find(u => String(u.email).toLowerCase() === email && u.role === type && Auth.verify(u, password));
      if (!account) { show('Incorrect email, password, or account type.'); return; }
      if (account.password) {
        Auth.setPassword(account, password);
        Storage.set('hcm_users', list);
      }
      Storage.set('hcm_session', { userId: account.id, role: account.role });
      location.href = account.role === 'admin' ? 'admin.html' : 'employee.html';
    });
  }
})();
