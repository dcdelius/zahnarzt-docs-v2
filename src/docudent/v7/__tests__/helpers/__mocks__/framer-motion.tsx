/**
 * Framer Motion Mock for JSDOM Testing
 * 
 * Mocks framer-motion so that motion.div etc render as plain divs.
 * This allows testing React components that use framer-motion in JSDOM.
 */

import { vi } from 'vitest';
import React from 'react';

// Create a proxy that wraps any element as a plain div/element
const createMotionProxy = () => {
    return new Proxy({}, {
        get: (_target, prop: string) => {
            // Handle common motion elements
            const elementMap: Record<string, string> = {
                div: 'div',
                span: 'span',
                button: 'button',
                a: 'a',
                ul: 'ul',
                li: 'li',
                p: 'p',
                h1: 'h1',
                h2: 'h2',
                h3: 'h3',
                section: 'section',
                header: 'header',
                footer: 'footer',
                nav: 'nav',
                main: 'main',
                article: 'article',
                aside: 'aside',
                input: 'input',
                textarea: 'textarea',
                label: 'label',
                form: 'form',
            };

            const tagName = elementMap[prop] || 'div';

            // Return a forwardRef component that renders the plain element
            return React.forwardRef(({ children, ...props }: any, ref: any) => {
                // Filter out framer-motion specific props
                const {
                    initial,
                    animate,
                    exit,
                    transition,
                    whileHover,
                    whileTap,
                    whileFocus,
                    whileInView,
                    variants,
                    layout,
                    layoutId,
                    drag,
                    dragConstraints,
                    dragElastic,
                    onDragEnd,
                    onDragStart,
                    ...htmlProps
                } = props;

                return React.createElement(tagName, { ...htmlProps, ref }, children);
            });
        }
    });
};

// Mock the motion object
export const motion = createMotionProxy();

// Mock AnimatePresence to just render children
export const AnimatePresence = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(React.Fragment, null, children);
};

// Mock useAnimation
export const useAnimation = () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
});

// Mock useMotionValue
export const useMotionValue = (initial: number) => ({
    get: () => initial,
    set: vi.fn(),
    onChange: vi.fn(),
});

// Mock useTransform
export const useTransform = (_value: any, _inputRange: number[], outputRange: number[]) => ({
    get: () => outputRange[0],
});

// Mock useSpring
export const useSpring = (value: any) => value;

// Mock useInView
export const useInView = () => true;

// Mock useCycle
export const useCycle = <T,>(...items: T[]) => {
    let index = 0;
    return [
        items[index],
        () => { index = (index + 1) % items.length; }
    ] as const;
};

// Default export for compatibility
export default { motion, AnimatePresence };
