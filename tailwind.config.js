/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		screens: {
  			'2xl': '1400px',
  			'3xl': '1700px',
  		},
  		fontSize: {
  			'xs': ['calc(0.75rem * var(--font-size-scale))', { lineHeight: '1rem' }],     // 12px * scale
  			'sm': ['calc(0.8125rem * var(--font-size-scale))', { lineHeight: '1.25rem' }], // 13px * scale
  			'base': ['calc(0.875rem * var(--font-size-scale))', { lineHeight: '1.375rem' }], // 14px * scale
  			'lg': ['calc(0.9375rem * var(--font-size-scale))', { lineHeight: '1.5rem' }],  // 15px * scale
  			'xl': ['calc(1rem * var(--font-size-scale))', { lineHeight: '1.625rem' }],     // 16px * scale
  			'2xl': ['calc(1.125rem * var(--font-size-scale))', { lineHeight: '1.75rem' }], // 18px * scale
  			'3xl': ['calc(1.25rem * var(--font-size-scale))', { lineHeight: '1.875rem' }], // 20px * scale
  			'4xl': ['calc(1.5rem * var(--font-size-scale))', { lineHeight: '2rem' }],      // 24px * scale
  			'5xl': ['calc(1.875rem * var(--font-size-scale))', { lineHeight: '2.25rem' }], // 30px * scale
  			'6xl': ['calc(2.25rem * var(--font-size-scale))', { lineHeight: '2.5rem' }],   // 36px * scale
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)'
		},
		boxShadow: {
			sm: 'var(--shadow-sm)',
			DEFAULT: 'var(--shadow)',
			md: 'var(--shadow-md)',
			lg: 'var(--shadow-lg)',
			xl: 'var(--shadow-xl)',
			'2xl': 'var(--shadow-2xl)',
			none: 'none'
		},
		keyframes: {
 			'accordion-down': {
 				from: {
 					height: '0'
 				},
 				to: {
 					height: 'var(--radix-accordion-content-height)'
 				}
 			},
 			'accordion-up': {
 				from: {
 					height: 'var(--radix-accordion-content-height)'
 				},
 				to: {
 					height: '0'
 				}
 			},
 			'shake': {
 				'0%, 100%': { transform: 'translateX(0)' },
 				'10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
 				'20%, 40%, 60%, 80%': { transform: 'translateX(4px)' }
 			}
 		},
 		animation: {
 			'accordion-down': 'accordion-down 0.2s ease-out',
 			'accordion-up': 'accordion-up 0.2s ease-out',
 			'shake': 'shake 0.5s ease-in-out'
 		}
  	}
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("tailwindcss-animate")
  ],
}
