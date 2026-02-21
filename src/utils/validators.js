export function validateCargoWeight(cargoWeight, maxCapacity) {
    return cargoWeight <= maxCapacity;
}

export function isLicenseExpired(expiryDate) {
    return new Date(expiryDate) < new Date();
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getStatusPillClass(status) {
    const map = {
        'Available': 'pill-available',
        'On Trip': 'pill-on-trip',
        'In Shop': 'pill-in-shop',
        'Retired': 'pill-retired',
        'On Duty': 'pill-on-duty',
        'Off Duty': 'pill-off-duty',
        'Suspended': 'pill-suspended',
        'Draft': 'pill-draft',
        'Dispatched': 'pill-dispatched',
        'Completed': 'pill-completed',
        'Cancelled': 'pill-cancelled',
        'In Progress': 'pill-in-progress',
    };
    return map[status] || 'pill-draft';
}
