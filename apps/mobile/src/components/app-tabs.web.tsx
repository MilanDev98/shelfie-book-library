import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { View } from 'react-native';

import { ShelfieTabBar, ShelfieTabButton } from '@/components/shelfie';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <ShelfieTabBar>
          <TabTrigger name="index" href="/" asChild>
            <ShelfieTabButton
              icon={{ ios: 'camera', android: 'photo_camera', web: 'camera' }}>
              Scan
            </ShelfieTabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <ShelfieTabButton
              icon={{ ios: 'books.vertical', android: 'menu_book', web: 'menu_book' }}>
              Library
            </ShelfieTabButton>
          </TabTrigger>
          <TabTrigger name="book" href="/book/1984" asChild>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ display: 'none' }} />
          </TabTrigger>
        </ShelfieTabBar>
      </TabList>
    </Tabs>
  );
}
