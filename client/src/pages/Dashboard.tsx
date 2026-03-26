import { useAuth } from "../auth/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div className="dashboard">
      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <section className="dashboard-card">
            <h3>로그인 정보</h3>
            <p>
              <strong>{user?.name}</strong>
            </p>
            <p className="dashboard-muted">{user?.login_id}</p>
            <button className="dashboard-logout" onClick={logout}>
              로그아웃
            </button>
          </section>

          <section className="dashboard-card">
            <h3>게시물 미리보기</h3>
            <p className="dashboard-muted">아직 표시할 게시물이 없습니다.</p>
          </section>
        </aside>

        <main className="dashboard-main">
          <section className="dashboard-card dashboard-mobile-login">
            <h3>로그인 정보</h3>
            <p>
              <strong>{user?.name}</strong>
            </p>
            <p className="dashboard-muted">{user?.login_id}</p>
            <button className="dashboard-logout" onClick={logout}>
              로그아웃
            </button>
          </section>
          <section className="dashboard-card dashboard-placeholder">
            <h3>게시물 요약</h3>
            <p className="dashboard-muted">
              게시물 리스트 또는 요약이 여기에 표시됩니다.
            </p>
          </section>
        </main>

        <aside className="dashboard-aside">
          <section className="dashboard-card">
            <h3>빠른 네비게이션</h3>
            <ul className="dashboard-list">
              <li>최근 활동</li>
              <li>공지사항</li>
              <li>도움말</li>
            </ul>
          </section>
        </aside>
      </div>

      <footer className="dashboard-footer">
        <span>ZKR Intranet</span>
        <span>© 2026 ZKR. All rights reserved.</span>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}
