
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays, Users, Package, Scissors, Wallet,
  LayoutDashboard, Plus, Search, Menu, X, Clock,
  TrendingUp, UserRound, Settings, LogOut, Bell,
  ChevronRight, Phone, CheckCircle2
} from "lucide-react";
import "./style.css";

function App() {
  const [page, setPage] = useState("dashboard");
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", phone: "", service: "", date: "", time: "", staff: ""
  });

  const menu = [
    { id: "dashboard", name: "Genel Bakış", icon: LayoutDashboard },
    { id: "appointments", name: "Randevular", icon: CalendarDays },
    { id: "customers", name: "Müşteriler", icon: Users },
    { id: "packages", name: "Paket Takibi", icon: Package },
    { id: "services", name: "Hizmetler", icon: Scissors },
    { id: "finance", name: "Kasa ve Finans", icon: Wallet }
  ];

  const addAppointment = (e) => {
    e.preventDefault();
    if (!form.name || !form.date || !form.time) return;
    setAppointments([...appointments, { ...form, id: Date.now() }]);
    if (!customers.some(c => c.phone === form.phone)) {
      setCustomers([...customers, {
        name: form.name, phone: form.phone, id: Date.now()
      }]);
    }
    setForm({ name: "", phone: "", service: "", date: "", time: "", staff: "" });
    setShowForm(false);
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(a => a.date === today);

  const titles = {
    dashboard: "Genel Bakış",
    appointments: "Randevu Yönetimi",
    customers: "Müşteri Kayıtları",
    packages: "Paket ve Seans Takibi",
    services: "Hizmetler",
    finance: "Kasa ve Finans"
  };

  return (
    <div className="app">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">SY</div>
          <div><strong>SEREN YILDIZ</strong><small>SALON YÖNETİMİ</small></div>
          <button className="close-menu" onClick={() => setMobileMenu(false)}><X /></button>
        </div>
        <div className="menu-label">MENÜ</div>
        {menu.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => { setPage(item.id); setMobileMenu(false); }}>
              <Icon size={19} /> {item.name}
              {page === item.id && <ChevronRight size={16} />}
            </button>
          );
        })}
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">SY</div>
            <div><strong>Seren Yıldız</strong><small>Yönetici</small></div>
            <Settings size={18} />
          </div>
          <small className="version">SEREN YILDIZ SALON • 1.0</small>
        </div>
      </aside>

      {mobileMenu && <div className="overlay" onClick={() => setMobileMenu(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)}><Menu /></button>
          <div className="breadcrumb">Seren Yıldız <span>/</span> {titles[page]}</div>
          <div className="top-actions">
            <button className="icon-button"><Bell size={19} /></button>
            <div className="top-avatar">SY</div>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">SALON YÖNETİM PANELİ</div>
              <h1>{titles[page]}</h1>
              <p>Salonunun günlük işlemlerini buradan yönetebilirsin.</p>
            </div>
            {(page === "dashboard" || page === "appointments") &&
              <button className="gold-button" onClick={() => setShowForm(true)}>
                <Plus size={18} /> Yeni Randevu
              </button>}
          </div>

          {page === "dashboard" && <>
            <div className="stats">
              <div className="stat-card"><div className="stat-icon"><CalendarDays /></div><span>Bugünkü Randevular</span><strong>{todayAppointments.length}</strong><small>Bugün</small></div>
              <div className="stat-card"><div className="stat-icon"><Users /></div><span>Toplam Müşteri</span><strong>{customers.length}</strong><small>Kayıtlı müşteri</small></div>
              <div className="stat-card"><div className="stat-icon"><Package /></div><span>Aktif Paket</span><strong>0</strong><small>Seans takibi</small></div>
              <div className="stat-card"><div className="stat-icon"><TrendingUp /></div><span>Günlük İşlem</span><strong>{todayAppointments.length}</strong><small>Randevu kaydı</small></div>
            </div>
            <div className="panel">
              <div className="panel-heading"><div><h2>Günün Randevuları</h2><p>Bugün için oluşturulan randevular</p></div><button className="text-button" onClick={() => setPage("appointments")}>Tümünü gör <ChevronRight size={16}/></button></div>
              {todayAppointments.length === 0 ?
                <div className="empty"><CalendarDays size={34}/><strong>Henüz randevu yok</strong><span>Yeni randevu ekleyerek başlayabilirsin.</span></div> :
                todayAppointments.map(a => <AppointmentRow key={a.id} a={a}/>)}
            </div>
          </>}

          {page === "appointments" && <div className="panel">
            <div className="panel-heading"><div><h2>Randevu Listesi</h2><p>Oluşturduğun tüm randevular</p></div></div>
            {appointments.length === 0 ? <div className="empty"><CalendarDays size={34}/><strong>Henüz randevu eklenmedi</strong><span>Yeni Randevu butonunu kullanabilirsin.</span></div> :
              appointments.map(a => <AppointmentRow key={a.id} a={a}/>)}
          </div>}

          {page === "customers" && <div className="panel">
            <div className="panel-heading"><div><h2>Müşteri Listesi</h2><p>Kayıtlı müşterilerin</p></div></div>
            <div className="search-box"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Müşteri ara..."/></div>
            {customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).length === 0 ?
              <div className="empty"><Users size={34}/><strong>Henüz müşteri kaydı yok</strong><span>Randevu eklediğinde müşteriler burada listelenir.</span></div> :
              customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c =>
                <div className="customer-row" key={c.id}><div className="avatar">{c.name.slice(0,1).toUpperCase()}</div><div><strong>{c.name}</strong><small>{c.phone}</small></div><Phone size={17}/></div>)}
          </div>}

          {page === "packages" && <div className="panel">
            <div className="panel-heading"><div><h2>Paket Takibi</h2><p>Müşteri paketleri ve seans bilgileri</p></div></div>
            <div className="empty"><Package size={34}/><strong>Paket kaydı henüz yok</strong><span>Paket yönetimini bir sonraki aşamada bağlayacağız.</span></div>
          </div>}

          {page === "services" && <div className="panel">
            <div className="panel-heading"><div><h2>Salon Hizmetleri</h2><p>Kuaför ve güzellik hizmetleri</p></div></div>
            <div className="service-grid">
              {["Saç Kesimi","Saç Boyama","Ombre / Sombre","Keratin Bakım","Diod Buz Lazer","Hydrafacial","Cilt Bakımı","İpek Kirpik","Kirpik Lifting","Protez Tırnak","Manikür / Pedikür","Bölgesel İncelme"].map(s =>
                <div className="service-item" key={s}><Scissors size={18}/>{s}</div>)}
            </div>
          </div>}

          {page === "finance" && <div className="panel">
            <div className="panel-heading"><div><h2>Kasa ve Finans</h2><p>Gelir ve gider takibi</p></div></div>
            <div className="empty"><Wallet size={34}/><strong>Finans ekranı hazırlandı</strong><span>Bu bölüm yalnızca yönetici kullanımına açık olacak. Kasa kayıtlarını sonraki aşamada bağlayacağız.</span></div>
          </div>}
        </div>
      </main>

      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}>
        <form className="modal" onSubmit={addAppointment} onClick={e => e.stopPropagation()}>
          <div className="modal-heading"><div><h2>Yeni Randevu</h2><p>Müşteri ve randevu bilgilerini gir.</p></div><button type="button" className="icon-button" onClick={() => setShowForm(false)}><X/></button></div>
          <label>Müşteri adı *</label><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Ad soyad"/>
          <label>Telefon</label><input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} placeholder="05xx xxx xx xx"/>
          <label>Hizmet</label><select value={form.service} onChange={e => setForm({...form,service:e.target.value})}><option value="">Hizmet seç</option>{["Saç Kesimi","Saç Boyama","Keratin Bakım","Diod Buz Lazer","Cilt Bakımı","İpek Kirpik","Manikür","Protez Tırnak"].map(s=><option key={s}>{s}</option>)}</select>
          <div className="form-grid"><div><label>Tarih *</label><input required type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></div><div><label>Saat</label><input type="time" value={form.time} onChange={e => setForm({...form,time:e.target.value})}/></div></div>
          <label>Personel</label><select value={form.staff} onChange={e => setForm({...form,staff:e.target.value})}><option value="">Personel seç</option>{["Seren","Personel 2","Personel 3","Personel 4"].map(s=><option key={s}>{s}</option>)}</select>
          <button className="gold-button submit-button" type="submit"><CheckCircle2 size={18}/> Randevuyu Kaydet</button>
        </form>
      </div>}
    </div>
  );
}

function AppointmentRow({a}) {
  return <div className="appointment-row"><div className="time"><Clock size={16}/>{a.time || "Saat yok"}</div><div className="appointment-info"><strong>{a.name}</strong><small>{a.service || "Hizmet belirtilmedi"} {a.staff ? " • " + a.staff : ""}</small></div><span className="date-label">{a.date}</span></div>;
}

createRoot(document.getElementById("root")).render(<App />);
