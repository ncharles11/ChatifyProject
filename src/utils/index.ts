export function formatTime(dateString: string | Date): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
  
  export function formatDate(dateString: string | Date): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
  
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
  
  export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  
  export function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
  }