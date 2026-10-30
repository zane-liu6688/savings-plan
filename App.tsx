import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DashboardScreen from './src/screens/DashboardScreen';
import JobsScreen from './src/screens/JobsScreen';
import DeductionsScreen from './src/screens/DeductionsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import BigItemsScreen from './src/screens/BigItemsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/theme';
import CustomTabBar from './src/components/CustomTabBar';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '800', fontSize: 18 },
          }}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: '📊 看板', headerTitle: '攒钱计划' }} />
          <Tab.Screen name="Jobs" component={JobsScreen} options={{ title: '💰 收入' }} />
          <Tab.Screen name="Deductions" component={DeductionsScreen} options={{ title: '🧾 扣除' }} />
          <Tab.Screen name="Expenses" component={ExpensesScreen} options={{ title: '🏠 生活' }} />
          <Tab.Screen name="Big" component={BigItemsScreen} options={{ title: '🛒 大件' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '⚙️ 设置' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
