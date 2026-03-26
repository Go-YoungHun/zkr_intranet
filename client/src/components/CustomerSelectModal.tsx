import { useEffect, useMemo, useState } from "react";
import type { Customer } from "../lib/customers";
import { fetchCustomers, formatCustomerLabel } from "../lib/customers";
import Modal from "./Modal";

type CustomerSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
  selectedCustomerId?: number | null;
};

export default function CustomerSelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedCustomerId,
}: CustomerSelectModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alphabetToHangul = useMemo(
    () => ({
      a: "에이",
      b: "비",
      c: "씨",
      d: "디",
      e: "이",
      f: "에프",
      g: "지",
      h: "에이치",
      i: "아이",
      j: "제이",
      k: "케이",
      l: "엘",
      m: "엠",
      n: "엔",
      o: "오",
      p: "피",
      q: "큐",
      r: "알",
      s: "에스",
      t: "티",
      u: "유",
      v: "브이",
      w: "더블유",
      x: "엑스",
      y: "와이",
      z: "지",
    }),
    []
  );
  const hangulToAlphabet = useMemo(
    () => [
      ["더블유", "w"],
      ["에이치", "h"],
      ["케이", "k"],
      ["엠", "m"],
      ["에스", "s"],
      ["에이", "a"],
      ["비", "b"],
      ["씨", "c"],
      ["디", "d"],
      ["이", "e"],
      ["에프", "f"],
      ["지", "g"],
      ["아이", "i"],
      ["제이", "j"],
      ["엘", "l"],
      ["엔", "n"],
      ["오", "o"],
      ["피", "p"],
      ["큐", "q"],
      ["알", "r"],
      ["티", "t"],
      ["유", "u"],
      ["브이", "v"],
      ["엑스", "x"],
      ["와이", "y"],
      ["제트", "z"],
    ],
    []
  );

  const buildHangulFromAlphabet = (value: string) => {
    const letters = value.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (!letters) return null;
    return letters
      .split("")
      .map((char) => alphabetToHangul[char as keyof typeof alphabetToHangul])
      .filter(Boolean)
      .join("");
  };

  const buildAlphabetFromHangul = (value: string) => {
    let remaining = value.replace(/\s+/g, "");
    let result = "";

    while (remaining.length > 0) {
      if (/^[a-zA-Z0-9]/.test(remaining)) {
        result += remaining[0].toLowerCase();
        remaining = remaining.slice(1);
        continue;
      }

      let matched = false;
      for (const [token, letter] of hangulToAlphabet) {
        if (remaining.startsWith(token)) {
          result += letter;
          remaining = remaining.slice(token.length);
          matched = true;
          break;
        }
      }

      if (!matched) {
        return null;
      }
    }

    return result || null;
  };

  const buildQueryVariants = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return [];
    const variants = new Set([trimmed]);
    const hangulVariant = buildHangulFromAlphabet(trimmed);
    if (hangulVariant) variants.add(hangulVariant);
    const alphabetVariant = buildAlphabetFromHangul(trimmed);
    if (alphabetVariant) variants.add(alphabetVariant);
    return Array.from(variants);
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setQuery("");
    fetchCustomers(false, undefined, 1, 1000)
      .then((data) => setCustomers(data.rows))
      .catch((fetchError: any) => {
        setError(fetchError?.message || "고객사 목록을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const filteredCustomers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return customers;
    const variants = buildQueryVariants(trimmed);
    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.name_en,
        customer.sales_agent,
        customer.salesAgency?.name,
        String(customer.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return variants.some((variant) => haystack.includes(variant));
    });
  }, [customers, query]);

  return (
    <Modal isOpen={isOpen} title="고객사 검색" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          placeholder="고객사명 또는 ID 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ padding: 8 }}
        />

        {loading && <div style={{ color: "#6b7280" }}>고객사 불러오는 중...</div>}
        {error && <div style={{ color: "crimson" }}>{error}</div>}

        {!loading && !error && (
          <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ color: "#6b7280" }}>검색 결과가 없습니다.</div>
            ) : (
              filteredCustomers.map((customer) => {
                const isSelected = selectedCustomerId === customer.id;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      onSelect(customer);
                      onClose();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: isSelected ? "#eef2ff" : "#fff",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {formatCustomerLabel(customer)}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>ID: {customer.id}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
