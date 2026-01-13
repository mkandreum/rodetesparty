/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.{php,html,js}",
        "./src/**/*.{php,html,js}"
    ],
    theme: {
        extend: {
            fontFamily: {
                'pixel': ['"VT323"', 'monospace', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
