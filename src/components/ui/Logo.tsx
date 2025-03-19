// components/ui/Logo.tsx
export function Logo() {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z"
          fill="url(#logoGradient)"
        />
        <path
          d="M12 10L20 16L12 22V10Z"
          fill="white"
        />
        <path
          d="M20 10L22 12L16 16L22 20L20 22L14 16L20 10Z"
          fill="white"
        />
        <defs>
          <linearGradient
            id="logoGradient"
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
    );
  }