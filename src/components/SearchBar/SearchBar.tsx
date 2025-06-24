import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, BarsArrowDownIcon } from '@heroicons/react/24/outline';
import { triggerHapticFeedback } from '../../helpers';
import { searchBarStyles } from './SearchBar.styles';

interface SearchBarProps {
  isSearchVisible: boolean;
  setIsSearchVisible: (visible: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSortMenuOpen: boolean;
  setIsSortMenuOpen: (open: boolean) => void;
  onSortSelect: (sortOption: string) => void;
  searchWidth: () => number;
}

export function SearchBar({
  isSearchVisible,
  setIsSearchVisible,
  searchQuery,
  setSearchQuery,
  isSortMenuOpen,
  setIsSortMenuOpen,
  onSortSelect,
  searchWidth,
}: SearchBarProps) {
  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchQuery('');
    }
    triggerHapticFeedback();
  };

  const toggleSortMenu = () => {
    setIsSortMenuOpen(!isSortMenuOpen);
    triggerHapticFeedback();
  };

  const handleSortSelect = (sortOption: string) => {
    onSortSelect(sortOption);
    setIsSortMenuOpen(false);
    triggerHapticFeedback();
  };

  const sortOptions = [
    { value: 'name', label: 'По имени' },
    { value: 'index', label: 'По индексу' },
    { value: 'collection', label: 'По коллекции' },
  ];

  return (
    <div style={searchBarStyles.container}>
      <motion.div
        animate={{
          width: isSearchVisible ? 40 + searchWidth() : 40,
          backgroundColor: '#121214',
        }}
        transition={{ duration: 0.3 }}
        style={searchBarStyles.searchContainer}
      >
        <motion.div
          onClick={toggleSearch}
          style={searchBarStyles.searchIcon}
        >
          <MagnifyingGlassIcon style={searchBarStyles.icon} />
        </motion.div>
        {isSearchVisible && (
          <motion.input
            type="text"
            placeholder="Search here"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            style={searchBarStyles.searchInput}
            autoFocus
          />
        )}
      </motion.div>
      
      <motion.div
        onClick={toggleSortMenu}
        style={searchBarStyles.sortButton}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
      >
        <BarsArrowDownIcon style={searchBarStyles.icon} />
      </motion.div>
      
      {isSortMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={searchBarStyles.sortMenu}
        >
          {sortOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSortSelect(option.value)}
              style={searchBarStyles.sortOption}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#282828')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {option.label}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}