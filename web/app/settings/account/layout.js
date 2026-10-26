import AccountTabs from '../../../components/AccountTabs.js';

export default function AccountLayout({ children }) {
  return (
    <section className="account-layout">
      <div className="page-heading">
        <div>
          <h1>Account</h1>
          <p className="page-description">Manage sign-in and account security.</p>
        </div>
      </div>
      <AccountTabs />
      {children}
    </section>
  );
}
