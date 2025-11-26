use anchor_lang::prelude::*;

declare_id!("EAdTq2R8jDTwFYCkYq2hm1v9webRddR3QWkLpBr31brp");

#[program]
pub mod book {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.admin = *ctx.accounts.authority.key;
        // access bump field directly
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn create_book(
        ctx: Context<CreateBook>,
        title: String,
        author: String,
        isbn: String,
        image: String,
        publisher: String,
        publication_date: i64,
        format_: String,
        genre: String,
    ) -> Result<()> {
        // require caller is the configured admin
        require!(
            ctx.accounts.config.admin == *ctx.accounts.authority.key,
            CustomError::UnauthorizedCreator
        );

        let book = &mut ctx.accounts.book;

        // validate lengths
        require!(title.len() <= Book::MAX_TITLE, CustomError::TitleTooLong);
        require!(author.len() <= Book::MAX_AUTHOR, CustomError::AuthorTooLong);
        require!(isbn.len() <= Book::MAX_ISBN, CustomError::IsbnTooLong);
        require!(image.len() <= Book::MAX_IMAGE, CustomError::ImageTooLong);
        require!(publisher.len() <= Book::MAX_PUBLISHER, CustomError::PublisherTooLong);
        require!(format_.len() <= Book::MAX_FORMAT, CustomError::FormatTooLong);
        require!(genre.len() <= Book::MAX_GENRE, CustomError::GenreTooLong);

        // admin is the canonical owner
        book.title = title;
        book.author = author;
        book.isbn = isbn;
        book.image = image;
        book.publisher = publisher;
        book.publication_date = publication_date;
        book.format_ = format_;
        book.genre = genre;
        book.created_at = Clock::get()?.unix_timestamp;
        // access bump field directly
        book.bump = ctx.bumps.book;

        Ok(())
    }

    pub fn update_genre(ctx: Context<UpdateGenre>, genre: String) -> Result<()> {
        // require caller is the configured admin
        require!(
            ctx.accounts.config.admin == *ctx.accounts.authority.key,
            CustomError::Unauthorized
        );
        require!(genre.len() <= Book::MAX_GENRE, CustomError::GenreTooLong);

        let book = &mut ctx.accounts.book;
        book.genre = genre;
        Ok(())
    }

    pub fn update_image(ctx: Context<UpdateImage>, image: String) -> Result<()> {
        // require caller is the configured admin
        require!(
            ctx.accounts.config.admin == *ctx.accounts.authority.key,
            CustomError::Unauthorized
        );
        require!(image.len() <= Book::MAX_IMAGE, CustomError::ImageTooLong);

        let book = &mut ctx.accounts.book;
        book.image = image;
        Ok(())
    }

    pub fn close_book(ctx: Context<CloseBook>) -> Result<()> {
        // require caller is the configured admin
        require!(
            ctx.accounts.config.admin == *ctx.accounts.authority.key,
            CustomError::Unauthorized
        );
        Ok(())
    }
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub bump: u8,
}

impl Config {
    pub const LEN: usize = 8 // discriminator
        + 32 // admin
        + 1; // bump
}

#[account]
pub struct Book {
    pub title: String,
    pub author: String,
    pub isbn: String,
    pub image: String,
    pub publisher: String,
    pub publication_date: i64,
    pub format_: String,
    pub genre: String,
    pub created_at: i64,
    pub bump: u8,
}

impl Book {
    pub const MAX_TITLE: usize = 200;
    pub const MAX_AUTHOR: usize = 64;
    pub const MAX_ISBN: usize = 32;
    pub const MAX_IMAGE: usize = 200;
    pub const MAX_PUBLISHER: usize = 64;
    pub const MAX_FORMAT: usize = 32;
    pub const MAX_GENRE: usize = 32;

    // size layout:
    // 8  - discriminator
    // 8  - created_at
    // 8  - publication_date
    // 1  - bump
    // then each String: 4 byte prefix + bytes
    pub const MAX_SIZE: usize = 8  // discriminator
        + 8  // created_at
        + 8  // publication_date
        + 1  // bump
        + 4 + Self::MAX_TITLE   // title
        + 4 + Self::MAX_AUTHOR  // author
        + 4 + Self::MAX_ISBN    // isbn
        + 4 + Self::MAX_IMAGE   // image
        + 4 + Self::MAX_PUBLISHER // publisher
        + 4 + Self::MAX_FORMAT   // format_
        + 4 + Self::MAX_GENRE;   // genre
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = Config::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    title: String,
    author: String,
    isbn: String,
    image: String,
    publisher: String,
    publication_date: i64,
    format_: String,
    genre: String
)]
pub struct CreateBook<'info> {
    #[account(
        init,
        payer = authority,
        space = Book::MAX_SIZE,
        seeds = [b"book", isbn.as_bytes()],
        bump
    )]
    pub book: Account<'info, Book>,

    /// config account that stores the admin pubkey
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateGenre<'info> {
    // use the stored isbn as seed to find the PDA
    #[account(mut, seeds = [b"book", book.isbn.as_bytes()], bump = book.bump)]
    pub book: Account<'info, Book>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateImage<'info> {
    // use the stored isbn as seed to find the PDA
    #[account(mut, seeds = [b"book", book.isbn.as_bytes()], bump = book.bump)]
    pub book: Account<'info, Book>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseBook<'info> {
    #[account(mut, close = authority, seeds = [b"book", book.isbn.as_bytes()], bump = book.bump)]
    pub book: Account<'info, Book>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

#[error_code]
pub enum CustomError {
    #[msg("Title too long")]
    TitleTooLong,
    #[msg("Author too long")]
    AuthorTooLong,
    #[msg("ISBN too long")]
    IsbnTooLong,
    #[msg("Image URL/CID too long")]
    ImageTooLong,
    #[msg("Publisher too long")]
    PublisherTooLong,
    #[msg("Format string too long")]
    FormatTooLong,
    #[msg("Genre too long")]
    GenreTooLong,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Only the configured admin can create books")]
    UnauthorizedCreator,
    #[msg("Invalid admin pubkey literal")]
    InvalidAdmin,
}
