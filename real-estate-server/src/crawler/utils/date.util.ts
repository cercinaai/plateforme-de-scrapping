export const isSameDay = ({ target_date, check_date }: { target_date: Date, check_date: Date }) => {
    return (
        target_date.getFullYear() === check_date.getFullYear() &&
        target_date.getMonth() === check_date.getMonth() &&
        target_date.getDate() === check_date.getDate()
    );
}



export const isSameDayOrBefore = ({ target_date, check_date, returnDays }: { target_date: Date, check_date: Date, returnDays: number }): boolean => {
    const previous = new Date(check_date);
    previous.setDate(previous.getDate() - returnDays);
    return (
        (target_date.getFullYear() === check_date.getFullYear() &&
            target_date.getMonth() === check_date.getMonth() &&
            target_date.getDate() === check_date.getDate()) ||
        (target_date.getFullYear() < previous.getFullYear() &&
            target_date.getMonth() < previous.getMonth() &&
            target_date.getDate() < previous.getDate()
        )
    );
}