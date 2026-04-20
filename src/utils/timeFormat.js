function formatTo12Hour(timeStr) {
    const date = new Date(`1970-01-01T${timeStr}`);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    return `${hours}:${minutes} ${ampm}`;
}

module.exports = { formatTo12Hour };