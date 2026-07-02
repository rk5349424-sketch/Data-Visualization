let rawData = [];
let filteredData = [];

let salesChart, categoryChart, regionChart, profitChart;

const totalSalesEl = document.getElementById("totalSales");
const totalProfitEl = document.getElementById("totalProfit");
const totalOrdersEl = document.getElementById("totalOrders");
const avgOrderEl = document.getElementById("avgOrder");
const categoryFilter = document.getElementById("categoryFilter");
const regionFilter = document.getElementById("regionFilter");
const reportContent = document.getElementById("reportContent");
const exportBtn = document.getElementById("exportBtn");
const tableBody = document.querySelector("#dataTable tbody");

// CSV load
async function loadCSV() {
  const response = await fetch("data/sales_data.csv");
  const csvText = await response.text();
  rawData = parseCSV(csvText);

  fillFilters(rawData);
  applyFilters();
}

// Simple CSV parser
function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] ? values[index].trim() : "";
    });
    return obj;
  });
}

// Fill filter dropdowns
function fillFilters(data) {
  const categories = [...new Set(data.map(item => item["Category"]))];
  const regions = [...new Set(data.map(item => item["Region"]))];

  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  regions.forEach(region => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionFilter.appendChild(option);
  });
}

// Apply filters
function applyFilters() {
  const category = categoryFilter.value;
  const region = regionFilter.value;

  filteredData = rawData.filter(item => {
    const categoryMatch = category === "All" || item["Category"] === category;
    const regionMatch = region === "All" || item["Region"] === region;
    return categoryMatch && regionMatch;
  });

  updateDashboard(filteredData);
}

function updateDashboard(data) {
  updateKPIs(data);
  renderCharts(data);
  renderReport(data);
  renderTable(data.slice(0, 15));
}

// KPI cards
function updateKPIs(data) {
  const totalSales = data.reduce((sum, item) => sum + Number(item["Sales"] || 0), 0);
  const totalProfit = data.reduce((sum, item) => sum + Number(item["Profit"] || 0), 0);
  const totalOrders = data.length;
  const avgOrder = totalOrders ? totalSales / totalOrders : 0;

  totalSalesEl.textContent = `$${totalSales.toFixed(2)}`;
  totalProfitEl.textContent = `$${totalProfit.toFixed(2)}`;
  totalOrdersEl.textContent = totalOrders;
  avgOrderEl.textContent = `$${avgOrder.toFixed(2)}`;
}

// Charts
function renderCharts(data) {
  const monthlySales = {};
  const categorySales = {};
  const regionSales = {};
  const categoryProfit = {};

  data.forEach(item => {
    const date = item["Order Date"];
    const month = date ? date.slice(0, 7) : "Unknown";

    const sales = Number(item["Sales"] || 0);
    const profit = Number(item["Profit"] || 0);
    const category = item["Category"] || "Unknown";
    const region = item["Region"] || "Unknown";

    monthlySales[month] = (monthlySales[month] || 0) + sales;
    categorySales[category] = (categorySales[category] || 0) + sales;
    regionSales[region] = (regionSales[region] || 0) + sales;
    categoryProfit[category] = (categoryProfit[category] || 0) + profit;
  });

  if (salesChart) salesChart.destroy();
  if (categoryChart) categoryChart.destroy();
  if (regionChart) regionChart.destroy();
  if (profitChart) profitChart.destroy();

  salesChart = new Chart(document.getElementById("salesChart"), {
    type: "line",
    data: {
      labels: Object.keys(monthlySales),
      datasets: [{
        label: "Monthly Sales",
        data: Object.values(monthlySales),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.2)",
        fill: true,
        tension: 0.3
      }]
    }
  });

  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "bar",
    data: {
      labels: Object.keys(categorySales),
      datasets: [{
        label: "Sales by Category",
        data: Object.values(categorySales),
        backgroundColor: ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
      }]
    }
  });

  regionChart = new Chart(document.getElementById("regionChart"), {
    type: "pie",
    data: {
      labels: Object.keys(regionSales),
      datasets: [{
        data: Object.values(regionSales),
        backgroundColor: ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
      }]
    }
  });

  profitChart = new Chart(document.getElementById("profitChart"), {
    type: "bar",
    data: {
      labels: Object.keys(categoryProfit),
      datasets: [{
        label: "Profit by Category",
        data: Object.values(categoryProfit),
        backgroundColor: "#10b981"
      }]
    }
  });
}

// Report section
function renderReport(data) {
  if (!data.length) {
    reportContent.innerHTML = "<p>No data available for selected filters.</p>";
    return;
  }

  const totalSales = data.reduce((sum, item) => sum + Number(item["Sales"] || 0), 0);
  const totalProfit = data.reduce((sum, item) => sum + Number(item["Profit"] || 0), 0);

  const categoryMap = {};
  const regionMap = {};

  data.forEach(item => {
    const category = item["Category"] || "Unknown";
    const region = item["Region"] || "Unknown";
    const sales = Number(item["Sales"] || 0);

    categoryMap[category] = (categoryMap[category] || 0) + sales;
    regionMap[region] = (regionMap[region] || 0) + sales;
  });

  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];
  const topRegion = Object.entries(regionMap).sort((a, b) => b[1] - a[1])[0];

  reportContent.innerHTML = `
    <p><strong>Total Sales:</strong> $${totalSales.toFixed(2)}</p>
    <p><strong>Total Profit:</strong> $${totalProfit.toFixed(2)}</p>
    <p><strong>Top Category:</strong> ${topCategory ? topCategory[0] : "-"}</p>
    <p><strong>Top Region:</strong> ${topRegion ? topRegion[0] : "-"}</p>
    <p><strong>Insight:</strong> The dashboard highlights which category and region contribute the most to sales. Use filters to compare performance and identify profitable segments.</p>
  `;
}

// Table preview
function renderTable(data) {
  tableBody.innerHTML = "";

  data.forEach(item => {
    const row = `
      <tr>
        <td>${item["Order Date"] || ""}</td>
        <td>${item["Category"] || ""}</td>
        <td>${item["Region"] || ""}</td>
        <td>${item["Sales"] || ""}</td>
        <td>${item["Profit"] || ""}</td>
        <td>${item["Quantity"] || ""}</td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
}

// Export CSV
function exportCSV(data) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(h => obj[h]).join(","));
  const csvContent = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "filtered_sales_data.csv";
  a.click();

  URL.revokeObjectURL(url);
}

categoryFilter.addEventListener("change", applyFilters);
regionFilter.addEventListener("change", applyFilters);
exportBtn.addEventListener("click", () => exportCSV(filteredData));

loadCSV();