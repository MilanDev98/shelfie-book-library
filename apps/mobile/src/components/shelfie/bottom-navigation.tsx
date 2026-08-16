import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';

import {
  ShelfieBottomBarHeight,
  ShelfieColors,
  ShelfieRadius,
  ShelfieSpacing,
} from '@/constants/theme';

import { ShelfieText } from './text';
import { subscribeToShelfieTabBar } from './tab-bar-visibility';

type ShelfieSymbolName = ComponentProps<typeof SymbolView>['name'];

export type ShelfieTabButtonProps = TabTriggerSlotProps & {
  icon: ShelfieSymbolName;
};

export function ShelfieTabButton({ children, icon, isFocused, ...props }: ShelfieTabButtonProps) {
  const color = isFocused ? ShelfieColors.primary : ShelfieColors.quiet;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <SymbolView name={icon} size={23} tintColor={color} weight="regular" />
      <ShelfieText variant="tab" style={{ color, fontWeight: isFocused ? '600' : '500' }}>
        {children}
      </ShelfieText>
    </Pressable>
  );
}

export function ShelfieTabBar({ routeHidden = false, style, ...props }: TabListProps & { routeHidden?: boolean }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => subscribeToShelfieTabBar(setVisible), []);

  return (
    <View {...props} style={[style, styles.container, (routeHidden || !visible) && styles.hidden]}>
      <View style={styles.tabRow}>{props.children}</View>
      <View style={styles.homeIndicatorArea}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    flexDirection: 'column',
    height: ShelfieBottomBarHeight,
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%',
  },
  tabRow: {
    alignItems: 'flex-start',
    backgroundColor: ShelfieColors.surface,
    borderTopColor: ShelfieColors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    height: 82,
    paddingHorizontal: ShelfieSpacing.xl,
    paddingTop: 11,
    width: '100%',
  },
  tabButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: ShelfieRadius.md,
    flex: 1,
    gap: 5,
    height: 56,
    justifyContent: 'center',
  },
  homeIndicatorArea: {
    alignItems: 'center',
    backgroundColor: ShelfieColors.surface,
    height: 22,
    justifyContent: 'center',
    width: '100%',
  },
  homeIndicator: {
    backgroundColor: ShelfieColors.ink,
    borderRadius: ShelfieRadius.full,
    height: 5,
    opacity: 0.28,
    width: 120,
  },
  pressed: {
    opacity: 0.72,
  },
  hidden: {
    display: 'none',
  },
});
