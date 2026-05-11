import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/dashboard-summary
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dashboard-summary', async (req, res) => {
  try {
    const { userId } = req.user;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM invoices WHERE user_id = $1) AS "totalInvoices",
        (
          SELECT COALESCE(SUM(total_cost), 0)
          FROM invoices
          WHERE user_id = $1
            AND created_at >= $2
            AND created_at < $3
        ) AS "totalSpent",
        (SELECT COUNT(*) FROM suppliers WHERE user_id = $1) AS "supplierCount",
        (
          SELECT COUNT(DISTINCT LOWER(TRIM(li.item_name)))
          FROM line_items li
          JOIN invoices i ON i.id = li.invoice_id
          WHERE i.user_id = $1
        ) AS "uniqueItems"`,
      [userId, monthStart, monthEnd]
    );

    const row = result.rows[0];
    res.json({
      totalInvoices: parseInt(row.totalInvoices, 10),
      totalSpent:    parseFloat(row.totalSpent),
      supplierCount: parseInt(row.supplierCount, 10),
      uniqueItems:   parseInt(row.uniqueItems, 10),
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/price-comparison
//
// Query params:
//   ?days=30  (default 30) – only include invoices from the last N days
//
// Only returns items that appear in 2+ suppliers in that period.
//
// Response shape:
// {
//   calculatedAt: "2026-05-11T06:03:51.000Z",
//   period: "last 30 days",
//   days: 30,
//   items: [
//     {
//       item_name: "Chicken Breast",
//       unit: "lb",
//       suppliers: [
//         {
//           supplier_name: "US Foods",
//           avg_price: 4.15,
//           latest_price: 4.20,
//           invoice_count: 2,
//           std_dev: 0.035
//         },
//         ...
//       ],
//       cheapest_supplier: "US Foods",
//       most_expensive_supplier: "Sysco",
//       potential_savings_per_unit: 0.30,
//       savings_message: "Save $0.30/lb using US Foods"
//     },
//     ...
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/price-comparison', async (req, res) => {
  try {
    const { userId } = req.user;

    // Parse ?days query param (default 30, min 1, max 3650)
    const rawDays = parseInt(req.query.days, 10);
    const days = (!Number.isNaN(rawDays) && rawDays > 0) ? Math.min(rawDays, 3650) : 30;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Pull line-item rows within the time window, ordered by date DESC so
    // prices[0] is the most recent for each supplier.
    const { rows } = await pool.query(
      `SELECT
         LOWER(TRIM(li.item_name))          AS item_key,
         li.item_name                        AS item_name,
         li.unit,
         s.name                              AS supplier_name,
         li.unit_price,
         i.invoice_date,
         i.created_at
       FROM line_items li
       JOIN invoices  i ON i.id  = li.invoice_id
       JOIN suppliers s ON s.id  = i.supplier_id
       WHERE i.user_id = $1
         AND li.unit_price IS NOT NULL
         AND li.unit_price > 0
         AND (
           i.invoice_date >= $2::date
           OR (i.invoice_date IS NULL AND i.created_at >= $2)
         )
       ORDER BY item_key, s.name, i.invoice_date DESC NULLS LAST, i.created_at DESC`,
      [userId, cutoff]
    );

    if (rows.length === 0) {
      return res.json({
        calculatedAt: new Date().toISOString(),
        period: `last ${days} days`,
        days,
        items: [],
      });
    }

    // Group rows by item_key → supplier_name → prices[]
    // Structure: Map<item_key, { item_name, unit, suppliers: Map<supplier_name, prices[]> }>
    const itemMap = new Map();

    for (const row of rows) {
      const key = row.item_key;

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item_name: row.item_name,
          unit:      row.unit || null,
          suppliers: new Map(),
        });
      }

      const item = itemMap.get(key);

      // Keep the most descriptive casing we've seen for the item name
      if (row.item_name && row.item_name.length > item.item_name.length) {
        item.item_name = row.item_name;
      }

      if (!item.suppliers.has(row.supplier_name)) {
        item.suppliers.set(row.supplier_name, []);
      }
      item.suppliers.get(row.supplier_name).push(parseFloat(row.unit_price));
    }

    // Helper: population standard deviation
    function stdDev(prices) {
      if (prices.length < 2) return 0;
      const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
      const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
      return Math.sqrt(variance);
    }

    // Build the response array – only include items with 2+ suppliers
    const items = [];

    for (const [, item] of itemMap) {
      // Skip items that only appear in a single supplier in this period
      if (item.suppliers.size < 2) continue;

      const supplierList = [];

      for (const [supplierName, prices] of item.suppliers) {
        const avg    = prices.reduce((s, p) => s + p, 0) / prices.length;
        const latest = prices[0]; // already ordered DESC by date
        const sd     = stdDev(prices);

        supplierList.push({
          supplier_name:  supplierName,
          avg_price:      parseFloat(avg.toFixed(4)),
          latest_price:   parseFloat(latest.toFixed(4)),
          invoice_count:  prices.length,
          std_dev:        parseFloat(sd.toFixed(4)),
        });
      }

      // Sort suppliers cheapest first (by latest price)
      supplierList.sort((a, b) => a.latest_price - b.latest_price);

      const cheapest      = supplierList[0];
      const mostExpensive = supplierList[supplierList.length - 1];
      const savings       = parseFloat(
        (mostExpensive.latest_price - cheapest.latest_price).toFixed(4)
      );

      const unitLabel = item.unit ? `/${item.unit}` : '/unit';
      const savingsMessage = savings > 0
        ? `Save $${savings.toFixed(2)}${unitLabel} using ${cheapest.supplier_name}`
        : null;

      items.push({
        item_name:                  item.item_name,
        unit:                       item.unit,
        suppliers:                  supplierList,
        cheapest_supplier:          cheapest.supplier_name,
        most_expensive_supplier:    mostExpensive.supplier_name,
        potential_savings_per_unit: savings,
        savings_message:            savingsMessage,
      });
    }

    // Sort output alphabetically by item name
    items.sort((a, b) => a.item_name.localeCompare(b.item_name));

    res.json({
      calculatedAt: new Date().toISOString(),
      period: `last ${days} days`,
      days,
      items,
    });
  } catch (err) {
    console.error('Price comparison error:', err);
    res.status(500).json({ error: 'Failed to load price comparison' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/overspend
//
// Looks at the last 90 days of purchases.  For each (item, supplier) pair,
// compares the price paid against the average price for that item across ALL
// suppliers.  Returns rows where the user paid above average, sorted by the
// biggest absolute overpay first.
//
// Response shape:
// [
//   {
//     item_name: "Chicken Breast",
//     supplier_name: "Best Meats",
//     current_price: 4.50,
//     market_average: 3.60,
//     overpay_per_unit: 0.90,
//     overpay_percent: 25.0,
//     quantity_purchased: 120
//   },
//   ...
// ]
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overspend', async (req, res) => {
  try {
    const { userId } = req.user;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    // Step 1 – pull all line items in the last 90 days for this user
    const { rows } = await pool.query(
      `SELECT
         LOWER(TRIM(li.item_name))  AS item_key,
         li.item_name,
         s.name                     AS supplier_name,
         li.unit_price,
         li.quantity,
         i.invoice_date,
         i.created_at
       FROM line_items li
       JOIN invoices  i ON i.id = li.invoice_id
       JOIN suppliers s ON s.id = i.supplier_id
       WHERE i.user_id = $1
         AND li.unit_price IS NOT NULL
         AND li.unit_price > 0
         AND (
           i.invoice_date >= $2::date
           OR (i.invoice_date IS NULL AND i.created_at >= $2)
         )
       ORDER BY item_key, s.name`,
      [userId, cutoff]
    );

    if (rows.length === 0) {
      return res.json([]);
    }

    // Step 2 – compute market average per item_key (across all suppliers)
    const itemPrices = new Map(); // item_key → all unit_prices[]
    for (const row of rows) {
      if (!itemPrices.has(row.item_key)) itemPrices.set(row.item_key, []);
      itemPrices.get(row.item_key).push(parseFloat(row.unit_price));
    }

    const marketAvg = new Map();
    for (const [key, prices] of itemPrices) {
      marketAvg.set(key, prices.reduce((s, p) => s + p, 0) / prices.length);
    }

    // Step 3 – aggregate per (item_key, supplier_name):
    //   latest price paid, total quantity purchased, average price paid
    const pairMap = new Map(); // `${item_key}|||${supplier_name}` → aggregated data

    for (const row of rows) {
      const pairKey = `${row.item_key}|||${row.supplier_name}`;
      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          item_name:    row.item_name,
          supplier_name: row.supplier_name,
          item_key:     row.item_key,
          prices:       [],
          total_qty:    0,
        });
      }
      const entry = pairMap.get(pairKey);
      entry.prices.push(parseFloat(row.unit_price));
      entry.total_qty += parseFloat(row.quantity || 0);
    }

    // Step 4 – build output for pairs where avg paid > market average
    const output = [];

    for (const [, entry] of pairMap) {
      const avg    = entry.prices.reduce((s, p) => s + p, 0) / entry.prices.length;
      const market = marketAvg.get(entry.item_key);

      if (avg <= market) continue; // not overpaying

      const overpay_per_unit = avg - market;
      const overpay_percent  = (overpay_per_unit / market) * 100;

      output.push({
        item_name:          entry.item_name,
        supplier_name:      entry.supplier_name,
        current_price:      parseFloat(avg.toFixed(4)),
        market_average:     parseFloat(market.toFixed(4)),
        overpay_per_unit:   parseFloat(overpay_per_unit.toFixed(4)),
        overpay_percent:    parseFloat(overpay_percent.toFixed(2)),
        quantity_purchased: parseFloat(entry.total_qty.toFixed(2)),
      });
    }

    // Sort by biggest absolute overpay first
    output.sort((a, b) => b.overpay_per_unit - a.overpay_per_unit);

    res.json(output);
  } catch (err) {
    console.error('Overspend error:', err);
    res.status(500).json({ error: 'Failed to load overspend data' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/savings-recommendations
//
// Looks at the last 90 days of purchases.  For each item, finds the supplier
// the user bought from most recently (current supplier) and the cheapest
// supplier available for that item in the same period.  If they differ,
// calculates potential savings based on estimated monthly usage (avg monthly
// quantity purchased in the period).
//
// Response shape:
// {
//   recommendations: [
//     {
//       itemName: "Chicken Breast",
//       currentSupplier: "Sysco",
//       currentPrice: 4.50,
//       cheapestSupplier: "US Foods",
//       cheapestPrice: 4.20,
//       savingsPerUnit: 0.30,
//       estimatedMonthlyUsage: 100,
//       estimatedMonthlySavings: 30.00,
//       totalAnnualSavings: 360.00
//     },
//     ...
//   ],
//   totalPotentialSavings: 1250.00
// }
// ─────────────────────────────────────────────────────────────────────────────
router.get('/savings-recommendations', async (req, res) => {
  try {
    const { userId } = req.user;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    // Pull all line items in the last 90 days with supplier info and dates.
    // Order by invoice_date / created_at DESC so the first row per
    // (item_key, supplier) is the most recent price.
    const { rows } = await pool.query(
      `SELECT
         LOWER(TRIM(li.item_name))  AS item_key,
         li.item_name,
         s.name                     AS supplier_name,
         li.unit_price,
         li.quantity,
         i.invoice_date,
         i.created_at
       FROM line_items li
       JOIN invoices  i ON i.id = li.invoice_id
       JOIN suppliers s ON s.id = i.supplier_id
       WHERE i.user_id = $1
         AND li.unit_price IS NOT NULL
         AND li.unit_price > 0
         AND li.quantity   IS NOT NULL
         AND li.quantity   > 0
         AND (
           i.invoice_date >= $2::date
           OR (i.invoice_date IS NULL AND i.created_at >= $2)
         )
       ORDER BY
         item_key,
         s.name,
         i.invoice_date DESC NULLS LAST,
         i.created_at   DESC`,
      [userId, cutoff]
    );

    if (rows.length === 0) {
      return res.json({ recommendations: [], totalPotentialSavings: 0 });
    }

    // ── Step 1: group by item_key → supplier_name ──────────────────────────
    // For each (item, supplier) track:
    //   latestPrice  – price on the most recent invoice (rows are DESC so first = latest)
    //   totalQty     – sum of quantity across all invoices in the period
    //   latestDate   – date of the most recent invoice (to find current supplier)

    const itemMap = new Map();
    // item_key → { itemName, suppliers: Map<supplierName, { latestPrice, totalQty, latestDate }> }

    for (const row of rows) {
      const key = row.item_key;

      if (!itemMap.has(key)) {
        itemMap.set(key, { itemName: row.item_name, suppliers: new Map() });
      }

      const item = itemMap.get(key);

      // Keep the most descriptive casing
      if (row.item_name && row.item_name.length > item.itemName.length) {
        item.itemName = row.item_name;
      }

      if (!item.suppliers.has(row.supplier_name)) {
        // First row for this supplier = most recent (due to ORDER BY DESC)
        item.suppliers.set(row.supplier_name, {
          latestPrice: parseFloat(row.unit_price),
          totalQty:    0,
          latestDate:  row.invoice_date ?? row.created_at,
        });
      }

      item.suppliers.get(row.supplier_name).totalQty += parseFloat(row.quantity);
    }

    // ── Step 2: build recommendations ─────────────────────────────────────
    const recommendations = [];

    for (const [, item] of itemMap) {
      // Need at least 2 suppliers to make a recommendation
      if (item.suppliers.size < 2) continue;

      // Find current supplier = the one with the most recent invoice date
      let currentSupplierName = null;
      let currentLatestDate   = null;

      for (const [supplierName, data] of item.suppliers) {
        const d = data.latestDate ? new Date(data.latestDate) : new Date(0);
        if (!currentLatestDate || d > currentLatestDate) {
          currentLatestDate   = d;
          currentSupplierName = supplierName;
        }
      }

      const currentData  = item.suppliers.get(currentSupplierName);
      const currentPrice = currentData.latestPrice;

      // Find cheapest supplier by latest price
      let cheapestSupplierName = null;
      let cheapestPrice        = Infinity;

      for (const [supplierName, data] of item.suppliers) {
        if (data.latestPrice < cheapestPrice) {
          cheapestPrice        = data.latestPrice;
          cheapestSupplierName = supplierName;
        }
      }

      // Only recommend if cheapest is a different supplier and saves money
      if (cheapestSupplierName === currentSupplierName) continue;

      const savingsPerUnit = currentPrice - cheapestPrice;
      if (savingsPerUnit <= 0) continue;

      // Estimate monthly usage: total qty purchased in 90 days ÷ 3 months
      const totalQtyAllSuppliers = [...item.suppliers.values()]
        .reduce((sum, d) => sum + d.totalQty, 0);
      const estimatedMonthlyUsage = totalQtyAllSuppliers / 3;

      const estimatedMonthlySavings = savingsPerUnit * estimatedMonthlyUsage;
      const totalAnnualSavings      = estimatedMonthlySavings * 12;

       recommendations.push({
         itemName:                item.itemName,
         currentSupplier:         currentSupplierName,
         currentPrice:            parseFloat(currentPrice.toFixed(4)),
         cheapestSupplier:        cheapestSupplierName,
         cheapestPrice:           parseFloat(cheapestPrice.toFixed(4)),
         savingsPerUnit:          parseFloat(savingsPerUnit.toFixed(4)),
         estimatedMonthlyUsage:   parseFloat(estimatedMonthlyUsage.toFixed(2)),
         estimatedMonthlySavings: parseFloat(estimatedMonthlySavings.toFixed(2)),
         totalAnnualSavings:      parseFloat(totalAnnualSavings.toFixed(2)),
       });
    }

    // Sort by biggest annual savings first
    recommendations.sort((a, b) => b.totalAnnualSavings - a.totalAnnualSavings);

    const totalPotentialSavings = parseFloat(
      recommendations.reduce((sum, r) => sum + r.totalAnnualSavings, 0).toFixed(2)
    );

    res.json({ recommendations, totalPotentialSavings });
  } catch (err) {
    console.error('Savings recommendations error:', err);
    res.status(500).json({ error: 'Failed to load savings recommendations' });
  }
});

export default router;
