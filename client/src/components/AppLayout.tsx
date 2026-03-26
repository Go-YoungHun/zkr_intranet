import { type KeyboardEvent, useId, useState } from "react";
import { Link, Outlet } from "react-router-dom";

const navGroups = [
  {
    id: "base",
    label: "기본정보",
    items: [
      { label: "고객사", to: "/customers" },
      { label: "장비", to: "/machines" },
      { label: "재고", to: "/inventories" },
    ],
  },
  {
    id: "work",
    label: "업무관리",
    items: [
      { label: "티켓", to: "/tickets" },
      { label: "변경이력", to: "/audit-logs" },
    ],
  },
  {
    id: "boards",
    label: "게시판",
    items: [
      { label: "공지사항", to: "/boards/notice" },
      { label: "자료실", to: "/boards/resource" },
    ],
  },
  {
    id: "hr",
    label: "인사",
    items: [
      { label: "직원명부", to: "/employees" },
      { label: "연차관리", to: "/employees/leave" },
      { label: "인사정보", to: "/employees/hr-info" },
    ],
  },
];

export default function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [openMobileGroupId, setOpenMobileGroupId] = useState<string | null>(null);
  const dropdownIdPrefix = useId();

  const handleGroupToggle = (groupId: string) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleMobileGroupToggle = (groupId: string) => {
    setOpenMobileGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      setOpenGroupId(null);
      setOpenMobileGroupId(null);
    }
  };

  const handleMenuOpenToggle = () => {
    setIsMenuOpen((prev) => !prev);
    setOpenMobileGroupId(null);
  };

  return (
    <div className="app-layout">
      <header className="app-layout-header">
        <div className="app-layout-header-left">
          <Link className="app-layout-logo" to="/">
            ZKR Intranet
          </Link>
          <nav className="app-layout-nav" onKeyDown={handleKeyDown}>
            {navGroups.map((group) => {
              const dropdownId = `${dropdownIdPrefix}-${group.id}`;
              const isOpen = openGroupId === group.id;

              return (
                <div className="app-layout-nav-group" key={group.id}>
                  <button
                    className="app-layout-nav-group-trigger"
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-controls={dropdownId}
                    onClick={() => handleGroupToggle(group.id)}
                  >
                    {group.label}
                  </button>
                  {isOpen && (
                    <div className="app-layout-dropdown" id={dropdownId} role="menu">
                      {group.items.map((item) =>
                        item.to ? (
                          <Link
                            className="app-layout-dropdown-item"
                            key={item.label}
                            role="menuitem"
                            to={item.to}
                            onClick={() => setOpenGroupId(null)}
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <span
                            className="app-layout-dropdown-item app-layout-dropdown-item--disabled"
                            key={item.label}
                            role="menuitem"
                            aria-disabled="true"
                          >
                            {item.label}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        <button
          className="app-layout-menu-button"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label="메뉴 열기"
          onClick={handleMenuOpenToggle}
        >
          ☰
        </button>
      </header>
      {isMenuOpen && (
        <div className="app-layout-mobile-menu" id="mobile-menu">
          <nav className="app-layout-mobile-nav" onKeyDown={handleKeyDown}>
            {navGroups.map((group) => {
              const sectionId = `mobile-${dropdownIdPrefix}-${group.id}`;
              const isSectionOpen = openMobileGroupId === group.id;

              return (
                <div className="app-layout-mobile-nav-group" key={group.id}>
                  <button
                    className="app-layout-mobile-nav-trigger"
                    type="button"
                    aria-expanded={isSectionOpen}
                    aria-controls={sectionId}
                    onClick={() => handleMobileGroupToggle(group.id)}
                  >
                    {group.label}
                  </button>
                  {isSectionOpen && (
                    <div className="app-layout-mobile-nav-items" id={sectionId}>
                      {group.items.map((item) =>
                        item.to ? (
                          <Link
                            className="app-layout-mobile-nav-item"
                            key={item.label}
                            to={item.to}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <span
                            className="app-layout-mobile-nav-item app-layout-mobile-nav-item--disabled"
                            key={item.label}
                            aria-disabled="true"
                          >
                            {item.label}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}
      <div className="app-layout-content">
        <Outlet />
      </div>
    </div>
  );
}
