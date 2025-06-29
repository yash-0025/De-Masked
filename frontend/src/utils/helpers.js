export const shortenAddress = (address) => {
    if(!address) return '';
    const prefix = address.substring(0,6);
    const suffix = address.substring(address.length - 4);
    return `${prefix}...${suffix}`;
}
