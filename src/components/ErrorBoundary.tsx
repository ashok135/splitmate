import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Production-grade Error Boundary that catches JS errors in the React tree
 * and displays a fallback UI instead of a black screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    const stack = error?.stack ? String(error.stack) : '';
    return {
      hasError: true,
      errorMessage: `${error?.name || 'Error'}: ${error?.message || ''}\n\n${stack}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('=== CRASH TRACE START ===');
    console.warn('MESSAGE:', String(error?.message));
    console.warn('STACK:', String(error?.stack));
    console.warn('COMPONENT_STACK:', String(errorInfo?.componentStack));
    console.warn('=== CRASH TRACE END ===');
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.icon}>!</Text>
            <Text style={styles.title}>Something Went Wrong</Text>
            <ScrollView style={styles.errorBox} nestedScrollEnabled={true}>
              <Text style={styles.errorText} selectable={true}>{this.state.errorMessage}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxHeight: '90%',
  },
  icon: {
    fontSize: 40,
    fontWeight: '900',
    color: '#EF4444',
    marginBottom: 8,
    width: 56,
    height: 56,
    lineHeight: 56,
    textAlign: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  errorBox: {
    maxHeight: 280,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#FCA5A5',
    lineHeight: 16,
  },
  retryBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
