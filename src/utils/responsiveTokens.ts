// Design tokens for responsive layouts
export const spacing = {
  // Touch-friendly spacing for mobile
  mobile: {
    xs: 'space-y-2',
    sm: 'space-y-3', 
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8'
  },
  // Compact spacing for desktop
  desktop: {
    xs: 'space-y-1',
    sm: 'space-y-2',
    md: 'space-y-3', 
    lg: 'space-y-4',
    xl: 'space-y-6'
  }
};

export const touchTargets = {
  // Minimum 44px touch targets for mobile
  mobile: {
    button: 'h-12 px-6',
    icon: 'h-12 w-12',
    link: 'py-3 px-4',
    input: 'h-12 px-4 py-3'
  },
  desktop: {
    button: 'h-10 px-4',
    icon: 'h-10 w-10', 
    link: 'py-2 px-3',
    input: 'h-10 px-3 py-2'
  }
};

export const typography = {
  mobile: {
    h1: 'text-2xl md:text-4xl font-bold leading-tight',
    h2: 'text-xl md:text-3xl font-bold leading-tight',
    h3: 'text-lg md:text-2xl font-semibold leading-tight',
    h4: 'text-base md:text-xl font-semibold leading-normal',
    h5: 'text-sm md:text-lg font-medium leading-normal',
    body: 'text-sm md:text-base leading-relaxed',
    small: 'text-xs md:text-sm leading-normal',
    caption: 'text-xs leading-tight'
  },
  desktop: {
    h1: 'text-4xl lg:text-5xl font-bold leading-tight',
    h2: 'text-3xl lg:text-4xl font-bold leading-tight', 
    h3: 'text-2xl lg:text-3xl font-semibold leading-tight',
    h4: 'text-xl lg:text-2xl font-semibold leading-normal',
    h5: 'text-lg lg:text-xl font-medium leading-normal',
    body: 'text-base lg:text-lg leading-relaxed',
    small: 'text-sm lg:text-base leading-normal',
    caption: 'text-xs lg:text-sm leading-tight'
  }
};

export const contentSpacing = {
  mobile: {
    section: 'py-4 px-3',
    container: 'py-3 px-3',
    card: 'p-3',
    hero: 'py-6 px-3',
    gap: 'gap-3'
  },
  desktop: {
    section: 'py-6 px-4',
    container: 'py-4 px-4', 
    card: 'p-4',
    hero: 'py-8 px-4',
    gap: 'gap-4'
  }
};

export const animations = {
  transition: 'transition-all duration-300 ease-in-out',
  slideIn: 'transform transition-transform duration-300 ease-out',
  fadeIn: 'opacity-0 animate-in fade-in duration-300',
  scale: 'transform transition-transform duration-200 hover:scale-105'
};