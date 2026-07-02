import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import BudgetsScreen from '../screens/BudgetsScreen';

const HomeStackNav = createNativeStackNavigator();

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
      <HomeStackNav.Screen name="CategoryDetail" component={CategoryDetailScreen} />
    </HomeStackNav.Navigator>
  );
}

const TAB_ICONS = {
  Home: '🏠',
  Activity: '📒',
  Insights: '💡',
  Budgets: '🎯',
};

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.boneDim,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.hairline,
        },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Activity" component={TransactionsScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
    </Tab.Navigator>
  );
}
