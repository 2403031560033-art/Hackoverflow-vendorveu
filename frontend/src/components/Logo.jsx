export default function Logo({ className = "w-8 h-8" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src="/logo.png" 
        alt="vendorvue" 
        className={className}
        onError={(e) => {
          // Fallback to text if logo image doesn't exist
          e.target.style.display = 'none';
        }}
      />
    </div>
  );
}
